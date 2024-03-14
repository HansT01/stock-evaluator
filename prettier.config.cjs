/** @type {import("prettier").Config} */
module.exports = {
  useTabs: false,
  tabWidth: 2,
  printWidth: 120,
  singleQuote: true,
  jsxSingleQuote: true,
  quoteProps: 'preserve',
  semi: false,
  plugins: ['prettier-plugin-tailwindcss'],
}
