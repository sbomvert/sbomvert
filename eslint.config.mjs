import next from "eslint-config-next";
import unusedImports from "eslint-plugin-unused-imports";
import designTokens from "./eslint-rules/design-tokens.js";


const config = [
  ...next,
  {
    // generated, git-ignored output: test coverage, VitePress caches/builds, built Storybook
    ignores: [
      "coverage/**",
      "docs-site/.vitepress/cache/**",
      "docs-site/.vitepress/dist/**",
      "storybook-static/**",
    ],
  },
  {
    plugins: {
        "unused-imports": unusedImports,
    },
    rules: {
        "no-unused-vars": "off", // or "@typescript-eslint/no-unused-vars": "off",
        "unused-imports/no-unused-imports": "error",
        "unused-imports/no-unused-vars": [
            "warn",
            {
                "vars": "all",
                "varsIgnorePattern": "^_",
                "args": "after-used",
                "argsIgnorePattern": "^_",
            },
        ]
    }
},
  {
    // components use the design tokens in src/app/globals.css (see eslint-rules/design-tokens.js)
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}"],
    plugins: { sbomvert: { rules: { "design-tokens": designTokens } } },
    rules: { "sbomvert/design-tokens": "error" },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
          message: "Do not use `as unknown as`: fix the type instead.",
        },
      ],
    },
  },
];

export default config;
