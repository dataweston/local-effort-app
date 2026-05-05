export type OrderStatus = "pending" | "redeemed" | "void";
export type OrderItem = {
    sku: string;
    name: string;
    qty: number;
    unit: number;
};
export type Order = {
    oid: string;
    n: string;
    email: string;
    items: OrderItem[];
    q: number;
    event_id: string;
    expires_at: string;
    jti: string;
    status: OrderStatus;
    created_at: string;
};
