import { timePointToPercentage } from '@schedule-x/shared/src/utils/stateless/time/interpolation/time-point-to-grid-percentage'
import { timePointsFromString } from '@schedule-x/shared/src/utils/stateless/time/time-points/string-conversion'
import { timeFromDateTime } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/string-to-string'
import { DayBoundariesInternal } from '@schedule-x/shared/src/types/calendar/day-boundaries'
import { DayBoundariesDateTime } from '@schedule-x/shared/src/types/day-boundaries-date-time'
import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { toIntegers } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/format-conversion'
import { timeStringFromTimePoints } from '@schedule-x/shared/src/utils/stateless/time/time-points/string-conversion'
import { addDays } from '@schedule-x/shared/src/utils/stateless/time/date-time-mutation/adding'

// Helper function to get X coordinate (left position) for timeline view
export const getXCoordinateInTimeline = (
  dateTime: Temporal.ZonedDateTime,
  weekStart: Temporal.ZonedDateTime,
  dayBoundaries: DayBoundariesInternal,
  pointsPerDay: number,
  daysInWeek: number
) => {
  const dayOfWeek = dateTime.dayOfWeek - weekStart.dayOfWeek
  const dayOffset = dayOfWeek < 0 ? dayOfWeek + 7 : dayOfWeek
  const timePercentage = timePointToPercentage(
    pointsPerDay,
    dayBoundaries,
    timePointsFromString(timeFromDateTime(dateTime.toString()))
  )
  return (dayOffset / daysInWeek) * 100 + timePercentage / daysInWeek
}

// Helper function to get event width for timeline view
// The width is calculated as a percentage of the week, where each day represents 1/daysInWeek of the total width
// Within each day, the width is calculated relative to the day boundaries
export const getEventWidthInTimeline = (
  start: Temporal.ZonedDateTime,
  end: Temporal.ZonedDateTime,
  dayBoundaries: DayBoundariesInternal,
  pointsPerDay: number,
  daysInWeek: number
) => {
  const startDay = start.dayOfWeek
  const endDay = end.dayOfWeek

  // Calculate the number of full days between start and end (excluding partial days)
  const daysDiff =
    endDay >= startDay ? endDay - startDay : 7 - startDay + endDay

  // Get time percentages within day boundaries for start and end
  const startTimePoint = timePointsFromString(
    timeFromDateTime(start.toString())
  )
  const endTimePoint = timePointsFromString(timeFromDateTime(end.toString()))

  const startPercentage = timePointToPercentage(
    pointsPerDay,
    dayBoundaries,
    startTimePoint
  )
  const endPercentage = timePointToPercentage(
    pointsPerDay,
    dayBoundaries,
    endTimePoint
  )

  // Calculate width:
  // 1. Full days: each full day is 100% of a day's width = 1/daysInWeek of the week
  // 2. Start day partial: from start percentage to end of day (100%)
  // 3. End day partial: from start of day (0%) to end percentage
  // 4. If same day: just the difference between end and start percentages

  let totalWidth = 0

  if (daysDiff === 0) {
    // Event is within a single day
    // Width is the percentage difference within that day, then divided by daysInWeek
    totalWidth = (endPercentage - startPercentage) / daysInWeek
  } else {
    // Event spans multiple days
    // Start day: from start percentage to 100% (end of day)
    const startDayWidth = (100 - startPercentage) / daysInWeek

    // Full days in between (if any)
    const fullDaysWidth = daysDiff > 1 ? ((daysDiff - 1) * 100) / daysInWeek : 0

    // End day: from 0% to end percentage
    const endDayWidth = endPercentage / daysInWeek

    totalWidth = startDayWidth + fullDaysWidth + endDayWidth
  }

  return totalWidth
}

// Helper to create day boundaries map
export const createDayBoundariesMap = (
  weekDays: Array<{ date: string }>,
  $app: CalendarAppSingleton
): Map<string, DayBoundariesDateTime> => {
  const map = new Map<string, DayBoundariesDateTime>()
  weekDays.forEach((day) => {
    const { year, month, date } = toIntegers(day.date)
    const zonedDateTime = Temporal.ZonedDateTime.from({
      year,
      month: month + 1,
      day: date,
      timeZone: $app.config.timezone.value,
    })
    const timeStringFromDayBoundary = timeStringFromTimePoints(
      $app.config.dayBoundaries.value.start
    )
    const timeStringFromDayBoundaryEnd = timeStringFromTimePoints(
      $app.config.dayBoundaries.value.end
    )
    const dayStartDateTime = zonedDateTime.with({
      hour: +timeStringFromDayBoundary.split(':')[0],
      minute: +timeStringFromDayBoundary.split(':')[1],
    })
    const endHour = +timeStringFromDayBoundaryEnd.split(':')[0]
    const endWithAdjustedTime = zonedDateTime.with({
      hour: endHour === 24 ? 23 : endHour,
      minute: endHour === 24 ? 59 : +timeStringFromDayBoundaryEnd.split(':')[1],
      second: endHour === 24 ? 59 : 0,
    })
    const dayEndDateTime = $app.config.isHybridDay
      ? (addDays(endWithAdjustedTime, 1) as Temporal.ZonedDateTime)
      : endWithAdjustedTime
    map.set(day.date, { start: dayStartDateTime, end: dayEndDateTime })
  })
  return map
}
