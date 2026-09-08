const withAlpha = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        ink: {
          950: withAlpha('ink-950'),
          900: withAlpha('ink-900'),
          800: withAlpha('ink-800'),
          700: withAlpha('ink-700'),
          600: withAlpha('ink-600'),
          500: withAlpha('ink-500'),
        },
        line: {
          DEFAULT: withAlpha('line'),
          soft: withAlpha('line-soft'),
          strong: withAlpha('line-strong'),
        },
        brand: {
          DEFAULT: withAlpha('brand'),
          bright: withAlpha('brand-bright'),
        },
        aqua: withAlpha('aqua'),
        mute: withAlpha('mute'),
        soft: withAlpha('soft'),
        strong: withAlpha('strong'),
        ok: withAlpha('ok'),
        warn: withAlpha('warn'),
        danger: withAlpha('danger'),
        orange: withAlpha('orange'),
        violet: withAlpha('violet'),
        pink: withAlpha('pink'),
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}
