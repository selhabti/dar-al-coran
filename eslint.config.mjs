import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".open-next/**",
      "public/sw.js",
      "public/swe-worker*",
      "gestion-institut-main-backup/**",
    ],
  },
];

export default eslintConfig;
