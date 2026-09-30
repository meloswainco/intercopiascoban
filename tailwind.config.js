module.exports = {
  content: [
    './Index.html',
    './renderer/modals.html',
    './renderer/js/**/*.js'
  ],
  safelist: [
    'bg-emerald-50',
    'border-emerald-200',
    'text-emerald-700',
    'bg-blue-50',
    'border-blue-200',
    'text-blue-700',
    'bg-red-50',
    'border-red-200',
    'border-red-300',
    'text-red-600',
    'text-red-700',
    'bg-green-50',
    'text-green-600',
    'bg-yellow-50',
    'border-yellow-300',
    'text-orange-500',
    'hover:bg-blue-50',
    'hover:bg-red-100',
    'hover:bg-yellow-100',
    'text-white',
    'text-slate-500',
    'text-slate-600',
    'text-gray-700',
    'font-bold',
    'font-black'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
          text: 'var(--color-primary-text)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          hover: 'var(--color-success-hover)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          hover: 'var(--color-danger-hover)',
        },
        warning: 'var(--color-warning)',
        app: 'var(--bg-app)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          alt: 'var(--bg-surface-alt)',
        },
        overlay: 'var(--bg-overlay)',
        border: 'var(--border-color)',
      },
      textColor: {
        main: 'var(--text-main)',
        muted: 'var(--text-muted)',
        light: 'var(--text-light)',
      },
      borderRadius: {
        'btn': '0.75rem', /* xl */
        'modal': '1.5rem', /* 3xl */
      }
    }
  },
  plugins: []
};