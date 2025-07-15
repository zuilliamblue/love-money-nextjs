/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
     "./src/**/*.{js,ts,jsx,tsx,mdx}",

  ],
  safelist: [
    'bg-orange-500',
    'border-orange-500',
    'bg-gray-400',
    'border-gray-400'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
