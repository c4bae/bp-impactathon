/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens. Contributors: use these, don't hardcode hex.
        brand: {
          DEFAULT: '#1f6f5c', // KW Hab green, AA on white for text >= 16px bold
          dark: '#144a3d',
          light: '#e6f2ee',
        },
        ink: '#1a1a1a',        // body text (contrast 15:1 on white)
        muted: '#5c5c5c',      // secondary text (AA on white)
        badge: {
          confirmed: '#1f6f5c',
          gap: '#9a3412',      // reported_gap — warm, not alarmist red
          unverified: '#5c5c5c',
        },
      },
      fontSize: {
        // Bump the base for readability; plain-language audience.
        base: ['1.0625rem', { lineHeight: '1.6' }],
      },
    },
  },
  plugins: [],
};
