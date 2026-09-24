import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { themeOptions, type AppThemeName } from '@/app/theme/themes'

export const useUiStore = defineStore(
  'ui',
  () => {
    const themeName = ref<AppThemeName>('storeEmerald')
    const navigationRail = ref(false)
    const activeTheme = computed(
      () => themeOptions.find((theme) => theme.value === themeName.value) ?? themeOptions[0],
    )
    const darkMode = computed(() => activeTheme.value.dark)

    function setTheme(name: AppThemeName) {
      themeName.value = name
    }

    function toggleRail() {
      navigationRail.value = !navigationRail.value
    }

    return { themeName, activeTheme, darkMode, navigationRail, setTheme, toggleRail }
  },
  { persist: true },
)
