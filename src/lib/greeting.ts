export type DayPart = 'morning' | 'afternoon' | 'night'

export function getDayPart(date = new Date()): DayPart {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 19) return 'afternoon'
  return 'night'
}

export const GREETING: Record<DayPart, { text: string; icon: string }> = {
  morning: { text: 'Buenos días', icon: 'wb_sunny' },
  afternoon: { text: 'Buenas tardes', icon: 'partly_cloudy_day' },
  night: { text: 'Buenas noches', icon: 'dark_mode' },
}
