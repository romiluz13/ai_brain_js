module.exports = {
  extends: ["eslint:recommended", "turbo"],
  plugins: ["@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ]
  },
  "parserOptions": {
    "ecmaVersion": 2020
  },
  "env": {
    "node": true,
    "es6": true
  },
  "ignorePatterns": ["node_modules", "dist", ".turbo"]
};