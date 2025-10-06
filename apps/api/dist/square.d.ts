export type CheckoutLineItem = {
    sku: string;
    name: string;
    quantity: number;
    amountCents: number;
};
export declare const createCheckout: ({ lineItems, tipCents, redirectUrl }: {
    lineItems: CheckoutLineItem[];
    tipCents: number;
    redirectUrl: string;
}) => Promise<{
    checkoutUrl: string;
}>;
//# sourceMappingURL=square.d.ts.map