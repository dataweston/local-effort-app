import { env } from "./env.js";
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
export const sendOrderEmail = async ({ order, jwt, qrUrl }) => {
    if (!env.BREVO_API_KEY || !env.BREVO_TEMPLATE_ID) {
        return { skipped: true };
    }
    const payload = {
        templateId: Number(env.BREVO_TEMPLATE_ID),
        to: [{ email: order.email, name: order.n }],
        params: {
            ORDER_ID: order.oid,
            FIRST_NAME: order.n.split(" ")[0],
            HUMAN_CODE: order.jti,
            JWT: jwt,
            QR_URL: qrUrl,
            PICKUP_INSTRUCTIONS: "Show this code at pickup to get your sandwich fast.",
            PICKUP_WINDOW: order.expires_at,
            VENUE_ADDRESS: "Paikka, St. Paul"
        }
    };
    const response = await fetch(BREVO_ENDPOINT, {
        method: "POST",
        headers: {
            "api-key": env.BREVO_API_KEY,
            "content-type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Brevo send failed: ${response.status} ${message}`);
    }
    return { skipped: false };
};
//# sourceMappingURL=brevo.js.map