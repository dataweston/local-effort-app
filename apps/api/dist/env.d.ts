type EnvConfig = {
    NODE_ENV: string;
    PORT: number;
    DB_URL: string;
    EVENT_ID: string;
    PUBLIC_BASE_URL: string;
    API_BASE_URL: string;
    JWT_KID: string;
    JWT_PRIVATE_KEY_BASE64?: string;
    JWT_PUBLIC_KEY_BASE64?: string;
    BREVO_API_KEY?: string;
    BREVO_TEMPLATE_ID?: string;
    SQUARE_ENV: "production" | "sandbox";
    SQUARE_ACCESS_TOKEN?: string;
    SQUARE_LOCATION_ID?: string;
};
export declare const env: EnvConfig;
export type Env = EnvConfig;
export {};
//# sourceMappingURL=env.d.ts.map