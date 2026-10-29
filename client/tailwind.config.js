/** Design tokens come from the original site's CSS variables, so Tailwind and the legacy styles agree. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  corePlugins: { preflight: false },   // the legacy stylesheet already has the base reset
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: 'var(--cream)', deep: 'var(--cream-deep)', line: 'var(--cream-line)' },
        blush: { DEFAULT: 'var(--blush)', deep: 'var(--blush-deep)', ink: 'var(--blush-ink)' },
        cocoa: { 900: 'var(--cocoa-900)', 700: 'var(--cocoa-700)', 500: 'var(--cocoa-500)', 300: 'var(--cocoa-300)', 100: 'var(--cocoa-100)' },
        gold: { 700: 'var(--gold-700)', 500: 'var(--gold-500)', 300: 'var(--gold-300)', 100: 'var(--gold-100)' },
        sage: { DEFAULT: 'var(--sage)', 100: 'var(--sage-100)' },
        terracotta: { DEFAULT: 'var(--terracotta)', 100: 'var(--terracotta-100)' },
        ink: { DEFAULT: 'var(--ink)', soft: 'var(--ink-soft)', faint: 'var(--ink-faint)' },
      },
      fontFamily: { display: ['Fraunces', 'Georgia', 'serif'], body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      boxShadow: { gold: 'var(--shadow-gold)', md: 'var(--shadow-md)' },
    },
  },
  plugins: [],
};
