/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {

      // ─── Brand colours ────────────────────────────────────────────────
      colors: {
        // Fixed brand
        primary:  '#4F46E5',     // indigo-600 – buttons, links, accents
        'primary-hover': '#4338CA', // indigo-700
        alt:      '#EA580C',     // orange-600 – secondary accent

        // Semantic surface tokens (resolve via CSS variables → light/dark)
        background:      'var(--color-background)',
        'background-alt':'var(--color-background-alt)',
        foreground:      'var(--color-foreground)',
        'foreground-muted':  'var(--color-foreground-muted)',
        'foreground-subtle': 'var(--color-foreground-subtle)',
        border:          'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',
        input:           'var(--color-input)',
        ring:            'var(--color-ring)',
        surface:         'var(--color-surface)',       // card / panel bg
        'surface-alt':   'var(--color-surface-alt)',   // hover row / code bg

        // Status tokens
        success:          'var(--color-success)',
        'success-subtle': 'var(--color-success-subtle)',
        'success-fg':     'var(--color-success-fg)',
        warning:          'var(--color-warning)',
        'warning-subtle': 'var(--color-warning-subtle)',
        'warning-fg':     'var(--color-warning-fg)',
        error:            'var(--color-error)',
        'error-subtle':   'var(--color-error-subtle)',
        'error-fg':       'var(--color-error-fg)',
        info:             'var(--color-info)',
        'info-subtle':    'var(--color-info-subtle)',
        'info-fg':        'var(--color-info-fg)',
      },

      // ─── Border radius ────────────────────────────────────────────────
      borderRadius: {
        sm:      '0.375rem',  // small badges, tight elements
        DEFAULT: '0.5rem',    // buttons, tags
        md:      '0.5rem',    // inputs, filter pills
        lg:      '0.75rem',   // cards, panels
        xl:      '0.75rem',   // large cards
        '2xl':   '1rem',      // hero cards, horizontal strip
        full:    '9999px',    // pills / avatars
        // Design-intent aliases
        badge:     '0.375rem',
        card:      '0.75rem',
        'card-lg': '1rem',
        pill:      '9999px',
        button:    '0.5rem',
        input:     '0.5rem',
        panel:     '0.75rem',
      },

      // ─── Box shadows ──────────────────────────────────────────────────
      boxShadow: {
        sm:      '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md:      '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        lg:      '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
        xl:      '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
        // Design-intent aliases
        card:        '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-hover':'0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        button:      '0 4px 6px -1px rgb(0 0 0 / 0.12), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        panel:       '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        none:        'none',
      },

      // ─── Spacing additions ────────────────────────────────────────────
      spacing: {
        'card-p':    '1.25rem',
        'card-p-lg': '1.5rem',
        section:     '2rem',
        inset:       '1rem',
        'inset-lg':  '1.5rem',
      },

      // ─── Typography ───────────────────────────────────────────────────
      fontSize: {
        label:        ['0.6875rem', { lineHeight: '1rem',    letterSpacing: '0.05em' }],
        caption:      ['0.75rem',   { lineHeight: '1rem' }],
        'body-sm':    ['0.875rem',  { lineHeight: '1.25rem' }],
        body:         ['1rem',      { lineHeight: '1.5rem' }],
        'heading-sm': ['1.125rem',  { lineHeight: '1.75rem', fontWeight: '600' }],
        heading:      ['1.25rem',   { lineHeight: '1.75rem', fontWeight: '600' }],
        'heading-lg': ['1.5rem',    { lineHeight: '2rem',    fontWeight: '700' }],
        display:      ['2rem',      { lineHeight: '2.5rem',  fontWeight: '800' }],
        'display-lg': ['3rem',      { lineHeight: '1',       fontWeight: '800' }],
      },

      fontWeight: {
        normal:    '400',
        medium:    '500',
        semibold:  '600',
        bold:      '700',
        extrabold: '800',
      },

      // ─── Animations ───────────────────────────────────────────────────
      animation: {
        'fade-in':  'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(20px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
