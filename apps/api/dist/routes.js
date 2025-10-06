import express from "express";
import { ensureActiveKey } from "./keys.js";
import { createOrder, listOrders, redeemOrder } from "./orders.js";
import { sendOrderEmail } from "./brevo.js";
import { env } from "./env.js";
import { renderQrPng } from "./qr.js";
import { createCheckout } from "./square.js";
const router = express.Router();
router.get("/health", (_req, res) => {
    res.json({ ok: true });
});
router.get("/keys/current", (_req, res) => {
    const key = ensureActiveKey();
    res.json({ kid: key.kid, alg: "EdDSA", publicKeyB64: key.publicKeyB64 });
});
router.get("/orders", (req, res, next) => {
    try {
        const eventId = req.query.event_id ?? env.EVENT_ID;
        const since = req.query.since ?? new Date(0).toISOString();
        const orders = listOrders(eventId, since);
        res.json(orders.map((order) => ({
            oid: order.oid,
            jti: order.jti,
            n: order.n,
            q: order.q,
            e: order.expires_at
        })));
    }
    catch (error) {
        next(error);
    }
});
router.post("/orders/create", async (req, res, next) => {
    try {
        const result = await createOrder(req.body);
        const qrUrl = `${env.API_BASE_URL}/qr/${encodeURIComponent(result.jwt)}.png`;
        if (result.created) {
            await sendOrderEmail({ order: result.order, jwt: result.jwt, qrUrl }).catch((error) => {
                console.error("Brevo send failed", error);
            });
        }
        res.status(result.created ? 201 : 200).json({ order: result.order, jwt: result.jwt, created: result.created });
    }
    catch (error) {
        next(error);
    }
});
router.post("/brevo/send", async (req, res, next) => {
    try {
        const { order, jwt } = req.body;
        if (!order || !jwt) {
            return res.status(400).json({ error: "Missing order or jwt" });
        }
        const qrUrl = `${env.API_BASE_URL}/qr/${encodeURIComponent(jwt)}.png`;
        await sendOrderEmail({ order, jwt, qrUrl });
        res.status(202).json({ ok: true });
    }
    catch (error) {
        next(error);
    }
});
router.get("/qr/:token.png", async (req, res, next) => {
    try {
        const { token } = req.params;
        const buffer = await renderQrPng(token);
        res.type("png").send(buffer);
    }
    catch (error) {
        next(error);
    }
});
router.post("/checkin", (req, res, next) => {
    try {
        const { oid, code, station_id, ts, override } = req.body ?? {};
        const id = oid ?? code;
        if (!id || !station_id || !ts) {
            return res.status(400).json({ error: "Missing oid/jti, station_id, or ts" });
        }
        const result = redeemOrder({
            id,
            stationId: station_id,
            timestamp: ts,
            override: Boolean(override)
        });
        if (!result.found) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.json({
            first_redeemed_at: result.firstRedeemedAt,
            station_id: result.stationId,
            override: result.override
        });
    }
    catch (error) {
        next(error);
    }
});
router.post("/square/checkout", async (req, res, next) => {
    try {
        const { items, tipCents, redirectUrl } = req.body ?? {};
        if (!Array.isArray(items) || !redirectUrl) {
            return res.status(400).json({ error: "Missing items or redirectUrl" });
        }
        const lineItems = items.map((item) => ({
            sku: item.sku,
            name: item.name,
            quantity: Number(item.qty ?? item.quantity ?? 1),
            amountCents: Number(item.unit ?? item.amountCents)
        }));
        const result = await createCheckout({
            lineItems,
            tipCents: Number(tipCents ?? 0),
            redirectUrl
        });
        res.json({ checkout_url: result.checkoutUrl });
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=routes.js.map