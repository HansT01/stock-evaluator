/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,jsx,ts,tsx}'],
  theme: {
    fontFamily: {
      sans: [
        'Inter',
        'ui-sans-serif',
        'system-ui',
        'sans-serif',
        'Apple Color Emoji',
        'Segoe UI Emoji',
        'Segoe UI Symbol',
        'Noto Color Emoji',
      ],
      mono: [
        'ui-monospace',
        'SFMono-Regular',
        'Menlo',
        'Monaco',
        'Consolas',
        'Liberation Mono',
        'Courier New',
        'monospace',
      ],
    },
    extend: {
      transitionDuration: {
        DEFAULT: '200ms',
      },
      colors: {
        'background': 'var(--background)',
        'background-fg': 'var(--background-fg)',
        'accent': 'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        'primary': 'var(--primary)',
        'primary-fg': 'var(--primary-fg)',
        'secondary': 'var(--secondary)',
        'secondary-fg': 'var(--secondary-fg)',
      },
    },
  },
}
