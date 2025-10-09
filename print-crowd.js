const path = require("path");
const mod = require(path.resolve(__dirname, "dist/assets/tmp-crowd.cjs"));
console.log(mod.default.toString());
