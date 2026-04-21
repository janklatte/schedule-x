import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { deepCloneEvent } from '@schedule-x/shared/src'
import { Week } from '@schedule-x/calendar/src/types/week'
import { addDays } from '@schedule-x/shared/src/utils/stateless/time/date-time-mutation/adding'
import { timeStringFromTimePoints } from '@schedule-x/shared/src/utils/stateless/time/time-points/string-conversion'
import { toIntegers } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/format-conversion'

/**
 * Splits multi-day timed events into per-day segments and appends them to each
 * day's timeGridEvents in the given week structure. Each segment is clamped to
 * the day's configured boundaries and marked with disableDND and disableResize
 * so that they cannot be dragged or resized.
 */
export const splitMultiDayTimedEvents = (
  multiDayTimedEvents: CalendarEventInternal[],
  week: Week,
  $app: CalendarAppSingleton
): void => {
  const weekDates = Object.keys(week).sort()
  if (weekDates.length === 0) return

  const timeStringStart = timeStringFromTimePoints(
    $app.config.dayBoundaries.value.start
  )
  const timeStringEnd = timeStringFromTimePoints(
    $app.config.dayBoundaries.value.end
  )
  const boundaryStartHour = +timeStringStart.split(':')[0]
  const boundaryStartMinute = +timeStringStart.split(':')[1]
  const boundaryEndHour = +timeStringEnd.split(':')[0]
  const boundaryEndMinute = +timeStringEnd.split(':')[1]

  for (const event of multiDayTimedEvents) {
    const eventStart = event.start as Temporal.ZonedDateTime
    const eventEnd = event.end as Temporal.ZonedDateTime

    for (const dateKey of weekDates) {
      const dayEntry = week[dateKey]
      if (!dayEntry) continue

      const { year, month, date } = toIntegers(dateKey)
      const dayZDT = Temporal.ZonedDateTime.from({
        year,
        month: month + 1,
        day: date,
        hour: 0,
        minute: 0,
        second: 0,
        timeZone: $app.config.timezone.value,
      })

      const dayBoundaryStart = dayZDT.with({
        hour: boundaryStartHour,
        minute: boundaryStartMinute,
        second: 0,
      })
      const endWithAdjustedTime = dayZDT.with({
        hour: boundaryEndHour === 24 ? 23 : boundaryEndHour,
        minute: boundaryEndHour === 24 ? 59 : boundaryEndMinute,
        second: boundaryEndHour === 24 ? 59 : 0,
      })
      const dayBoundaryEnd = $app.config.isHybridDay
        ? (addDays(endWithAdjustedTime, 1) as Temporal.ZonedDateTime)
        : endWithAdjustedTime

      // Skip days where the event does not overlap at all
      if (Temporal.ZonedDateTime.compare(eventEnd, dayBoundaryStart) <= 0)
        continue
      if (Temporal.ZonedDateTime.compare(eventStart, dayBoundaryEnd) >= 0)
        continue

      const segmentStart =
        Temporal.ZonedDateTime.compare(eventStart, dayBoundaryStart) > 0
          ? eventStart
          : dayBoundaryStart
      const segmentEnd =
        Temporal.ZonedDateTime.compare(eventEnd, dayBoundaryEnd) < 0
          ? eventEnd
          : dayBoundaryEnd

      if (Temporal.ZonedDateTime.compare(segmentStart, segmentEnd) >= 0)
        continue

      const segment = deepCloneEvent(event, $app)
      segment.start = segmentStart
      segment.end = segmentEnd
      segment._options = {
        ...event._options,
        disableDND: true,
        disableResize: true,
      }

      dayEntry.timeGridEvents.push(segment)
    }
  }
}
