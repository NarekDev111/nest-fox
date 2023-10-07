/* eslint-disable @typescript-eslint/no-var-requires */

// module.exports = {
//     plugins: [...require('@samatech/postcss-basics')()],
// };
const path = require('path');

module.exports = {
  plugins: {
    tailwindcss: {
      config: path.join(__dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
};
