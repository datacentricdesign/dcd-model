module.exports = {
  parser: "babel-eslint",
  env: {
    es6: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module"
  },
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended"
  ]
};