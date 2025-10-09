import { Order } from "@local-effort/shared";
type SendEmailParams = {
    order: Order;
    jwt: string;
    qrUrl: string;
};
export declare const sendOrderEmail: ({ order, jwt, qrUrl }: SendEmailParams) => Promise<{
    skipped: true;
} | {
    skipped: false;
}>;
export {};
//# sourceMappingURL=brevo.d.ts.map