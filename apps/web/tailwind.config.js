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
        brand: {
          yellow: '#F0B90B',
          dark: '#0B0E11',
          card: '#181A20',
          border: '#2B313A',
          muted: '#848E9C',
        },
      },
    },
  },
  plugins: [],
};
