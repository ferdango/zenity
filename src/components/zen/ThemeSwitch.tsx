import { setTheme, THEME_LABEL, type ThemePref, useTheme } from '../../lib/theme'
import { SegmentedTabs } from '../SegmentedTabs'

/** Selector de apariencia: Claro · Oscuro · Automático. */
export function ThemeSwitch() {
  const theme = useTheme()
  return (
    <SegmentedTabs<ThemePref>
      label="Apariencia"
      stretch
      value={theme}
      onChange={setTheme}
      tabs={(['light', 'dark', 'system'] as ThemePref[]).map((id) => ({ id, label: THEME_LABEL[id] }))}
    />
  )
}
