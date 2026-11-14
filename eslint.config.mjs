import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// src/domain は純関数だけ（実装計画 1 の Global Constraints）。
// 今日の日付は引数で受け取り、I/O・クラスを持たない。
const domainRules = {
  files: ["src/domain/**/*.ts"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "NewExpression[callee.name='Date'][arguments.length=0]",
        message: "引数なしの new Date() は書けません。今日の日付は引数で受け取ってください",
      },
      {
        selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
        message: "Date.now() は書けません。今日の日付は引数で受け取ってください",
      },
      {
        selector: "ClassDeclaration, ClassExpression",
        message: "domain にクラスは書けません。純関数と Readonly な型で書いてください",
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  domainRules,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { varsIgnorePattern: "^_" }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**"]),
]);

export default eslintConfig;
