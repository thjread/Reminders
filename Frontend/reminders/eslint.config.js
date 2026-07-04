import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist", "dev-dist", "src/sugar.js", "src/sugar.d.ts"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            globals: { ...globals.browser },
        },
        rules: {
            "no-console": ["error", { allow: ["warn", "error"] }],
            "@typescript-eslint/no-explicit-any": "off",
            "prefer-const": ["error", { destructuring: "all" }],
        },
    },
    {
        files: ["src/sw.js"],
        languageOptions: {
            globals: { ...globals.serviceworker },
        },
    },
);
