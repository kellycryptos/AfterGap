/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#07070A',
        card: '#121214',
        accent: {
          DEFAULT: '#F5C542',
          hover: '#E0B02E',
        },
        primary: '#F5F5F4',
        mute: '#A1A1AA',
        danger: '#C45C26',
        success: '#3D9A6A',
      },
    },
  },
  plugins: [],
};
