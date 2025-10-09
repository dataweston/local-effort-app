import { Order } from "@local-effort/shared";
export type OrderCreationResult = {
    order: Order;
    jwt: string;
    created: boolean;
};
export declare const createOrder: (payload: unknown) => Promise<OrderCreationResult>;
export declare const listOrders: (eventId: string, sinceIso: string) => Order[];
export declare const redeemOrder: (input: {
    id: string;
    stationId: string;
    timestamp: string;
    override: boolean;
}) => {
    readonly found: false;
    order?: undefined;
    firstRedeemedAt?: undefined;
    stationId?: undefined;
    override?: undefined;
} | {
    found: true;
    order: Order;
    firstRedeemedAt: string;
    stationId: string;
    override: boolean;
};
//# sourceMappingURL=orders.d.ts.map