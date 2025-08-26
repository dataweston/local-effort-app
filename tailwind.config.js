/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Scans all your React components
  ],
  theme: {
    extend: {
      // You can extend the default theme here if needed
      fontFamily: {
        display: ['General Sans', 'sans-serif'],
        body: ['Source Sans 3', 'sans-serif'],
      },
      colors: {
        accent: '#f35c2b',
      }
    },
  },
  plugins: [],
}