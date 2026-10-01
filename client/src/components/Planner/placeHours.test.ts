// FE-PLANNER-HOURS-001 to FE-PLANNER-HOURS-003
import { describe, expect, it } from 'vitest'
import { emptyWeek, hoursLines, periodsFromWeek, readWeek, weekdayNames, writeWeek } from './placeHours'

const week = JSON.stringify([
  { closed: false, open: '09:00', close: '17:00' },
  { closed: false, open: '20:00', close: '02:00' },
  { closed: false },
  { closed: false, open: '10:00' },
  { closed: false },
  { closed: true },
  { closed: false, open: '22:00', close: '03:00' },
])

describe('hand-kept opening hours (#2472)', () => {
  it('FE-PLANNER-HOURS-001: an empty week is stored as nothing, and reads back as an empty week', () => {
    expect(writeWeek(emptyWeek())).toBe('')
    expect(readWeek('')).toEqual(emptyWeek())
    expect(readWeek(week)[0]).toEqual({ closed: false, open: '09:00', close: '17:00' })
    expect(weekdayNames('en')[0]).toBe('Monday')
  })

  it('FE-PLANNER-HOURS-002: the inspector lines read like looked-up ones, closed days and gaps included', () => {
    expect(hoursLines(week, 'en', 'Closed')).toEqual([
      'Monday: 09:00 – 17:00', 'Tuesday: 20:00 – 02:00', 'Wednesday: –', 'Thursday: 10:00 – …',
      'Friday: –', 'Saturday: Closed', 'Sunday: 22:00 – 03:00',
    ])
    expect(hoursLines(writeWeek(emptyWeek()), 'en', 'Closed')).toBeNull()
  })

  it('FE-PLANNER-HOURS-003: periods count from Sunday and carry an overnight close into the next day', () => {
    expect(periodsFromWeek(week)).toEqual([
      { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 17, minute: 0 } },
      { open: { day: 2, hour: 20, minute: 0 }, close: { day: 3, hour: 2, minute: 0 } },
      { open: { day: 0, hour: 22, minute: 0 }, close: { day: 1, hour: 3, minute: 0 } },
    ])
    expect(periodsFromWeek(null)).toEqual([])
  })
})
