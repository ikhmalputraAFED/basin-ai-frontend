import { useColorMode } from '@vueuse/core'

export const useDarkMode = () => {
  const mode = useColorMode({
    attribute: 'class',
    modes: {
      light: 'light',
      dark: 'dark',
    },
  })

  const isDark = computed(() => mode.value === 'dark')

  const toggleDarkMode = () => {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  const setDarkMode = (dark: boolean) => {
    mode.value = dark ? 'dark' : 'light'
  }

  return {
    mode,
    isDark,
    toggleDarkMode,
    setDarkMode,
  }
}