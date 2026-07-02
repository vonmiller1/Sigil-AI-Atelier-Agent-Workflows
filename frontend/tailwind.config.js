/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sigil-ai-atelier': {
          blue: {
            50: '#EFF6FF',
            500: '#3B82F6',
            600: '#2563EB',
            700: '#1D4ED8',
          },
          bg: {
            canvas: '#F9FAFB', // Main background for workspace
            sidebar: '#F3F4F6', // Left sidebar background
          },
          surface: '#FFFFFF', // White card surfaces & input panels
          border: {
            light: '#E5E7EB', // Thin border grey
            active: '#3B82F6', // Border focus highlight
          },
          text: {
            primary: '#111827', // Crisp dark titles
            muted: '#6B7280',   // Subtitles & descriptions
          },
          status: {
            live: {
              bg: '#DCFCE7',
              text: '#15803D',
            },
            warning: {
              bg: '#FEF3C7',
              text: '#B45309',
            },
            alert: {
              bg: '#FEE2E2',
              text: '#B91C1C',
            },
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'brand': '10px',
        'brand-lg': '12px',
      },
      boxShadow: {
        'brand-card': '0 4px 20px -4px rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.03)',
        'brand-input': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
