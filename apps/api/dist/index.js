import express from "express";
import router from "./routes.js";
import { env } from "./env.js";
import { ensureActiveKey } from "./keys.js";
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});
app.use(router);
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});
const start = async () => {
    ensureActiveKey();
    app.listen(env.PORT, () => {
        console.log(`API listening on :${env.PORT}`);
    });
};
void start();
//# sourceMappingURL=index.js.map