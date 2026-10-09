/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        quicksand: ['Quicksand', 'sans-serif'],
        // Keep system fallback
      },
      colors: {
        // Neko theme (Login, Register, Landing)
        paw: {
          50: '#fff9ed',
          100: '#fef1d6',
          200: '#fce2ad',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        cream: {
          50: '#FFFDF9',
          100: '#FAF5EE',
          200: '#F2E4D2',
          800: '#543D2B',
          900: '#382618',
        },
        // Future brand theme (Student, Admin)
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      boxShadow: {
        cozy: '0 20px 45px -10px rgba(110, 68, 25, 0.15), 0 8px 16px -6px rgba(110, 68, 25, 0.08)',
      },
      backgroundImage: {
        landscape: "url('/images/landscaping.png')",
      },
    },
  },
  plugins: [],
}
