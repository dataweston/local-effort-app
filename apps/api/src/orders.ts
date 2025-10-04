import { db } from "./db.js";
import { env } from "./env.js";
import { makeHumanCode, signToken, Order, OrderStatus } from "@local-effort/shared";
import { getActiveKey, getKeyByKid } from "./keys.js";

const itemsMap = {
  SMOKED_CHICKEN: {
    sku: "SMOKED_CHICKEN" as const,
    name: "Smoked chicken on sourdough focaccia",
    unit: 1400
  },
  PUMPKIN_ROMESCO: {
    sku: "PUMPKIN_ROMESCO" as const,
    name: "Pumpkin & romesco on sourdough focaccia",
    unit: 1300
  }
};

type ItemKey = keyof typeof itemsMap;

type OrderItemInput = {
  sku: ItemKey;
  qty: number;
};

type CreateOrderInput = {
  email: string;
  firstName: string;
  lastName?: string;
  items: OrderItemInput[];
  paymentReference: string;
  tipCents?: number;
  pickupExpiresAt?: string;
  eventId?: string;
};

const isItemKey = (value: unknown): value is ItemKey =>
  typeof value === "string" && value in itemsMap;

const assertOrderInput = (payload: any): CreateOrderInput => {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid request body");
  }

  const email = payload.email;
  if (typeof email !== "string" || !email.includes("@")) {
    throw new Error("Invalid email");
  }

  const firstName = payload.firstName;
  if (typeof firstName !== "string" || firstName.trim().length === 0) {
    throw new Error("Invalid first name");
  }

  const lastName = typeof payload.lastName === "string" ? payload.lastName : undefined;

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("At least one item required");
  }

  const items: OrderItemInput[] = payload.items.map((item: any) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("Invalid item");
    }
    if (!isItemKey(item.sku)) {
      throw new Error("Invalid SKU");
    }
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error("Invalid quantity");
    }
    return { sku: item.sku, qty };
  });

  const paymentReference = payload.paymentReference;
  if (typeof paymentReference !== "string" || paymentReference.trim().length === 0) {
    throw new Error("Missing payment reference");
  }

  const tipCentsRaw = Number(payload.tipCents ?? 0);
  if (!Number.isFinite(tipCentsRaw) || tipCentsRaw < 0) {
    throw new Error("Invalid tip amount");
  }

  const pickupExpiresAt = payload.pickupExpiresAt;
  if (pickupExpiresAt && typeof pickupExpiresAt !== "string") {
    throw new Error("Invalid pickup expiration");
  }

  const eventId = typeof payload.eventId === "string" ? payload.eventId : undefined;

  return {
    email,
    firstName,
    lastName,
    items,
    paymentReference,
    tipCents: tipCentsRaw,
    pickupExpiresAt,
    eventId
  };
};

const insertOrderStmt = db.prepare(
  `INSERT INTO orders (
     oid,
     n,
     email,
     items_json,
     q,
     event_id,
     expires_at,
     jti,
     status,
     created_at,
     payment_reference,
     tip_cents,
     token,
     signing_kid
   ) VALUES (
     @oid,
     @n,
     @email,
     @items_json,
     @q,
     @event_id,
     @expires_at,
     @jti,
     @status,
     @created_at,
     @payment_reference,
     @tip_cents,
     @token,
     @signing_kid
   )`
);

const selectOrderByPaymentReferenceStmt = db.prepare(
  `SELECT oid, n, email, items_json, q, event_id, expires_at, jti, status, created_at, token, signing_kid
   FROM orders
   WHERE payment_reference = @payment_reference
   LIMIT 1`
);

const updateOrderTokenStmt = db.prepare(
  `UPDATE orders SET token = @token, signing_kid = @signing_kid WHERE oid = @oid`
);

const selectOrdersStmt = db.prepare(
  `SELECT oid, n, email, items_json, q, event_id, expires_at, jti, status, created_at FROM orders
   WHERE event_id = @event_id AND datetime(created_at) >= datetime(@since)
   ORDER BY created_at ASC`
);

const getOrderForRedeemStmt = db.prepare(
  `SELECT o.oid, o.n, o.email, o.items_json, o.q, o.event_id, o.expires_at, o.jti, o.status, o.created_at,
          r.ts AS redeemed_at, r.station_id AS redeemed_station, r.override AS redeemed_override
   FROM orders o
   LEFT JOIN redemptions r ON r.oid = o.oid
   WHERE o.oid = @id OR o.jti = @id`
);

const upsertRedemptionStmt = db.prepare(
  `INSERT INTO redemptions (oid, station_id, ts, override)
   VALUES (@oid, @station_id, @ts, @override)
   ON CONFLICT(oid) DO UPDATE SET station_id = excluded.station_id, ts = excluded.ts, override = excluded.override`
);

const totalForDateStmt = db.prepare(
  `SELECT COUNT(*) as count FROM orders WHERE date(created_at) = date(@date)`
);

type OrderRow = {
  oid: string;
  n: string;
  email: string;
  items_json: string;
  q: number;
  event_id: string;
  expires_at: string;
  jti: string;
  status: OrderStatus;
  created_at: string;
  token?: string | null;
  signing_kid?: string | null;
};

type RedeemRow = OrderRow & {
  redeemed_at?: string | null;
  redeemed_station?: string | null;
  redeemed_override?: number | null;
};

const toOrder = (row: OrderRow): Order => ({
  oid: row.oid,
  n: row.n,
  email: row.email,
  items: JSON.parse(row.items_json),
  q: row.q,
  event_id: row.event_id,
  expires_at: row.expires_at,
  jti: row.jti,
  status: row.status,
  created_at: row.created_at
});

const formatSequence = (value: number) => value.toString().padStart(6, "0");

const buildOid = (createdAt: Date, sequence: number) => {
  const datePart = createdAt.toISOString().slice(0, 10);
  return `LE-${datePart}-${formatSequence(sequence)}`;
};

const buildDisplayName = (first: string, last?: string | null) => {
  const trimmedFirst = first.trim();
  const trimmedLast = last?.trim() ?? "";
  const lastInitial = trimmedLast ? `${trimmedLast[0].toUpperCase()}` : "";
  return lastInitial ? `${trimmedFirst} ${lastInitial}` : trimmedFirst;
};

export type OrderCreationResult = {
  order: Order;
  jwt: string;
  created: boolean;
};

export const createOrder = async (payload: unknown): Promise<OrderCreationResult> => {
  const data = assertOrderInput(payload);

  const existingRow = selectOrderByPaymentReferenceStmt.get({
    payment_reference: data.paymentReference
  }) as (OrderRow & { token?: string | null }) | undefined;

  if (existingRow) {
    const existingOrder = toOrder(existingRow);
    if (existingRow.token) {
      return { order: existingOrder, jwt: existingRow.token, created: false };
    }

    const keyFromStore = existingRow.signing_kid
      ? getKeyByKid(existingRow.signing_kid)
      : undefined;
    const key = keyFromStore ?? getActiveKey();

    if (!key.privateKey) {
      throw new Error("Active signing key missing private component");
    }

    const jwt = await signToken(
      {
        oid: existingOrder.oid,
        n: existingOrder.n,
        q: existingOrder.q,
        e: existingOrder.expires_at,
        v: existingOrder.event_id,
        t: "sando",
        jti: existingOrder.jti
      },
      key.kid,
      key.privateKey
    );

    updateOrderTokenStmt.run({ token: jwt, signing_kid: key.kid, oid: existingOrder.oid });

    return { order: existingOrder, jwt, created: false };
  }

  const createdAt = new Date();
  const expiresAt = data.pickupExpiresAt
    ? new Date(data.pickupExpiresAt)
    : new Date(createdAt.getTime() + 3 * 60 * 60 * 1000);

  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error("Invalid pickup expiration");
  }

  const totalForDay = totalForDateStmt.get({ date: createdAt.toISOString() }) as { count: number };
  const sequence = totalForDay.count + 1;
  const oid = buildOid(createdAt, sequence);
  const jti = makeHumanCode();

  const items = data.items.map((item) => {
    const preset = itemsMap[item.sku];
    return { ...preset, qty: item.qty };
  });

  const order: Order = {
    oid,
    n: buildDisplayName(data.firstName, data.lastName),
    email: data.email,
    items,
    q: items.reduce<number>((sum, item) => sum + item.qty, 0),
    event_id: data.eventId ?? env.EVENT_ID,
    expires_at: expiresAt.toISOString(),
    jti,
    status: "pending",
    created_at: createdAt.toISOString()
  };

  const signingKey = getActiveKey();
  if (!signingKey.privateKey) {
    throw new Error("Active signing key missing private component");
  }

  const jwt = await signToken(
    {
      oid: order.oid,
      n: order.n,
      q: order.q,
      e: order.expires_at,
      v: order.event_id,
      t: "sando",
      jti: order.jti
    },
    signingKey.kid,
    signingKey.privateKey
  );

  insertOrderStmt.run({
    oid: order.oid,
    n: order.n,
    email: order.email,
    items_json: JSON.stringify(order.items),
    q: order.q,
    event_id: order.event_id,
    expires_at: order.expires_at,
    jti: order.jti,
    status: order.status,
    created_at: order.created_at,
    payment_reference: data.paymentReference,
    tip_cents: data.tipCents ?? 0,
    token: jwt,
    signing_kid: signingKey.kid
  });

  return { order, jwt, created: true };
};

export const listOrders = (eventId: string, sinceIso: string) => {
  const rows = selectOrdersStmt.all({ event_id: eventId, since: sinceIso }) as OrderRow[];
  return rows.map(toOrder);
};

export const redeemOrder = (input: {
  id: string;
  stationId: string;
  timestamp: string;
  override: boolean;
}) => {
  const row = getOrderForRedeemStmt.get({ id: input.id }) as RedeemRow | undefined;
  if (!row) {
    return { found: false } as const;
  }

  const firstRedeemTs = row.redeemed_at as string | null;
  const order = toOrder(row);

  const redemptionPayload = {
    oid: order.oid,
    station_id: input.stationId,
    ts: input.timestamp,
    override: input.override ? 1 : 0
  };

  upsertRedemptionStmt.run(redemptionPayload);

  return {
    found: true as const,
    order,
    firstRedeemedAt: firstRedeemTs ?? input.timestamp,
    stationId: (row.redeemed_station as string | null) ?? input.stationId,
    override: Boolean(row.redeemed_override)
  };
};
