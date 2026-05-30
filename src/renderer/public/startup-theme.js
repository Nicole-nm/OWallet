/* global document, window */

;(function () {
  var themeMode = 'system'

  try {
    var storedThemeMode = window.localStorage.getItem('owallet:settings:theme-mode')
    if (storedThemeMode === 'light' || storedThemeMode === 'dark' || storedThemeMode === 'system') {
      themeMode = storedThemeMode
    }
  } catch {
    themeMode = 'system'
  }

  var isDarkTheme = themeMode === 'dark'
  if (themeMode === 'system') {
    try {
      isDarkTheme = Boolean(
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      )
    } catch {
      isDarkTheme = false
    }
  }

  var resolvedTheme = isDarkTheme ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', resolvedTheme)
  document.documentElement.style.colorScheme = resolvedTheme
})()
