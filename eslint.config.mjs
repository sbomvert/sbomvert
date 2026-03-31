import next from "eslint-config-next";
import unusedImports from "eslint-plugin-unused-imports";


const config = [
  ...next,
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
}
];

export default config;

