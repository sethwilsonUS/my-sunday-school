'use client'

import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const getInitialTheme = (): Theme => {
  if (typeof document === 'undefined') {
    return 'light'
  }

  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    setTheme(getInitialTheme())
  }, [])

  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={theme === 'dark'}
      className="theme-toggle"
      onClick={() => {
        document.documentElement.setAttribute('data-theme', nextTheme)
        localStorage.setItem('theme', nextTheme)
        setTheme(nextTheme)
      }}
      type="button"
    >
      <svg aria-hidden="true" className="theme-toggle__sun" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
      </svg>
      <svg aria-hidden="true" className="theme-toggle__moon" viewBox="0 0 24 24">
        <path d="M20 14.68A7.8 7.8 0 0 1 9.32 4 8.25 8.25 0 1 0 20 14.68Z" />
      </svg>
    </button>
  )
}
