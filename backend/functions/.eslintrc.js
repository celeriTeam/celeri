module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "linebreak-style": 0,
    "no-trailing-spaces": "error",
    "max-len": ["error", {"code": 2000, "ignoreStrings": true, "ignoreTemplateLiterals": true}],
    "keyword-spacing": ["error", {"before": true, "after": true}],
    "space-before-blocks": ["error", "always"],
    "comma-dangle": ["error", "always-multiline"],
    "brace-style": ["error", "1tbs", {"allowSingleLine": true}],
    "no-tabs": "error",
    "indent": ["error", 2],
    "no-mixed-spaces-and-tabs": "error",
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
