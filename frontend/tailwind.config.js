/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6366f1', foreground: '#ffffff' },
        destructive: { DEFAULT: '#ef4444', foreground: '#ffffff' },
        muted: { DEFAULT: '#f3f4f6', foreground: '#6b7280' },
        accent: { DEFAULT: '#f0fdf4', foreground: '#166534' },
      },
    },
  },
  plugins: [],
};
