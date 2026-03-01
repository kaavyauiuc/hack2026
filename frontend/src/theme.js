import { useState, useEffect } from 'react'

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'phosphene'
}

export function applyTheme(name) {
  document.documentElement.setAttribute('data-theme', name)
  localStorage.setItem('theme', name)
  window.dispatchEvent(new Event('themechange'))
}

export function useTheme() {
  const [theme, setThemeState] = useState(getTheme)
  useEffect(() => {
    const handler = () => setThemeState(getTheme())
    window.addEventListener('themechange', handler)
    return () => window.removeEventListener('themechange', handler)
  }, [])
  return theme
}
