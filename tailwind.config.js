export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  blocklist: [
    '[-:T.Z]',
    '[a-zA-Z0-9_:\\-]',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
