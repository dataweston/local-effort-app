import { Client, Environment } from "square";
import { env } from "./env.js";
import { randomUUID } from "node:crypto";

export type CheckoutLineItem = {
  sku: string;
  name: string;
  quantity: number;
  amountCents: number;
};

export const createCheckout = async ({
  lineItems,
  tipCents,
  redirectUrl
}: {
  lineItems: CheckoutLineItem[];
  tipCents: number;
  redirectUrl: string;
}) => {
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    throw new Error("Square configuration missing");
  }

  const client = new Client({
    accessToken: env.SQUARE_ACCESS_TOKEN,
    environment: env.SQUARE_ENV === "production" ? Environment.Production : Environment.Sandbox
  });

  const orderRequest = {
    locationId: env.SQUARE_LOCATION_ID,
    lineItems: lineItems.map((item) => ({
      name: item.name,
      quantity: item.quantity.toString(),
      basePriceMoney: {
        amount: BigInt(item.amountCents),
        currency: "USD"
      },
      note: item.sku
    })),
    serviceCharges: tipCents
      ? [
          {
            name: "Gratuity",
            amountMoney: {
              amount: BigInt(tipCents),
              currency: "USD"
            }
          }
        ]
      : []
  };

  const checkout = await client.checkoutApi.createPaymentLink({
    idempotencyKey: randomUUID(),
    order: orderRequest,
    checkoutOptions: {
      redirectUrl
    }
  });

  const url = checkout.result?.paymentLink?.url;
  if (!url) {
    throw new Error("Square Checkout did not return a URL");
  }

  return { checkoutUrl: url };
};
