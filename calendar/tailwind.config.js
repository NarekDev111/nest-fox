/** @type {import('tailwindcss').Config} */
const path = require('path');

module.exports = {
  content: [
    path.join(__dirname, './src/**/*.{vue,js,ts,jsx,tsx}'),
    path.join(__dirname, './index.html'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
