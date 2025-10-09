import { Client, Environment } from "square";
import { env } from "./env.js";
import { randomUUID } from "node:crypto";
const toSquareAmount = (value) => {
    const numeric = Number.isFinite(value) ? Number(value) : 0;
    const rounded = Math.max(0, Math.round(numeric));
    return BigInt(rounded);
};
export const createCheckout = async ({ lineItems, tipCents, redirectUrl }) => {
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
                amount: toSquareAmount(item.amountCents),
                currency: "USD"
            },
            note: item.sku
        })),
        serviceCharges: tipCents
            ? [
                {
                    name: "Gratuity",
                    amountMoney: {
                        amount: toSquareAmount(tipCents),
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
//# sourceMappingURL=square.js.map