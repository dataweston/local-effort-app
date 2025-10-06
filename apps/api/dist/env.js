import { config } from "dotenv";
import path from "node:path";
import fs from "node:fs";
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    config({ path: envPath });
}
const coerceNumber = (value, fallback) => {
    if (!value)
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const requireEnv = (key) => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required env var ${key}`);
    }
    return value;
};
const optionalEnv = (key) => process.env[key];
export const env = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    PORT: coerceNumber(process.env.PORT, 4000),
    DB_URL: process.env.DB_URL ?? "file:./data.db",
    EVENT_ID: requireEnv("EVENT_ID"),
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
    API_BASE_URL: process.env.API_BASE_URL ?? "http://localhost:4000",
    JWT_KID: requireEnv("JWT_KID"),
    JWT_PRIVATE_KEY_BASE64: optionalEnv("JWT_PRIVATE_KEY_BASE64"),
    JWT_PUBLIC_KEY_BASE64: optionalEnv("JWT_PUBLIC_KEY_BASE64"),
    BREVO_API_KEY: optionalEnv("BREVO_API_KEY"),
    BREVO_TEMPLATE_ID: optionalEnv("BREVO_TEMPLATE_ID"),
    SQUARE_ENV: process.env.SQUARE_ENV === "production" ? "production" : "sandbox",
    SQUARE_ACCESS_TOKEN: optionalEnv("SQUARE_ACCESS_TOKEN"),
    SQUARE_LOCATION_ID: optionalEnv("SQUARE_LOCATION_ID")
};
//# sourceMappingURL=env.js.map