import { PLACE_HOURS_DAYS, hasPlaceHours, parsePlaceHours, type PlaceOpeningHours } from '@trek/shared'

/** A week with nothing set yet: open, no times. */
export function emptyWeek(): PlaceOpeningHours {
  return Array.from({ length: PLACE_HOURS_DAYS }, () => ({ closed: false }))
}

/** The week as the form holds it: the stored text, or an empty week to start from. */
export function readWeek(raw: string | null | undefined): PlaceOpeningHours {
  return parsePlaceHours(raw) ?? emptyWeek()
}

/** The week as the place keeps it; a week that says nothing is stored as nothing. */
export function writeWeek(week: PlaceOpeningHours): string {
  return hasPlaceHours(week) ? JSON.stringify(week) : ''
}

/** Weekday names Monday first, in the viewer's language (2024-01-01 was a Monday). */
export function weekdayNames(locale: string | undefined, width: 'long' | 'short' = 'long'): string[] {
  return Array.from({ length: PLACE_HOURS_DAYS }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: width }))
}

/**
 * The hand-kept hours as the weekday lines the inspector already shows for
 * looked-up hours (#2472): "Monday: 09:00 – 17:00", or the closed word. Null
 * when the place has no hours of its own, so the looked-up ones take over.
 */
export function hoursLines(raw: string | null | undefined, locale: string | undefined, closedLabel: string): string[] | null {
  const week = parsePlaceHours(raw)
  if (!hasPlaceHours(week)) return null
  const names = weekdayNames(locale)
  return week!.map((day, i) => {
    if (day.closed) return `${names[i]}: ${closedLabel}`
    if (!day.open && !day.close) return `${names[i]}: –`
    return `${names[i]}: ${day.open ?? '…'} – ${day.close ?? '…'}`
  })
}

/**
 * The hand-kept week as the periods the open-now ring is computed from, so a
 * place with its own hours gets the same green or red as a looked-up one.
 * Periods count days like Google, Sunday 0; a closing time at or before the
 * opening time belongs to the next day.
 */
export function periodsFromWeek(raw: string | null | undefined): { open: { day: number; hour: number; minute: number }; close: { day: number; hour: number; minute: number } }[] {
  const week = parsePlaceHours(raw)
  if (!week) return []
  const point = (time: string, day: number) => {
    const [hour, minute] = time.split(':').map(Number)
    return { day, hour, minute }
  }
  return week.flatMap((day, i) => {
    if (day.closed || !day.open || !day.close) return []
    const googleDay = (i + 1) % 7
    const overnight = day.close <= day.open
    return [{ open: point(day.open, googleDay), close: point(day.close, overnight ? (googleDay + 1) % 7 : googleDay) }]
  })
}
