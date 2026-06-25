/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/react/**/*.{js,jsx}",
    "./src/react/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      height: {
        '80vh': '80vh',
      },
      width: {
        '70%': '70%',
        '30%': '30%',
      }
    },
  },
  plugins: [],
}