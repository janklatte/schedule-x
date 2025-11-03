import { Week } from '@schedule-x/calendar/src/types/week'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import { dateFromDateTime } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/string-to-string'
import { toIntegers } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/format-conversion'
import { addDays } from '@schedule-x/shared/src/utils/stateless/time/date-time-mutation/adding'

/**
 * Positions events in the week agenda view.
 * Unlike positionInTimeGrid, this function adds events to ALL days they span,
 * making it suitable for agenda views where multi-day events should appear on each day.
 */
export const positionEventsForAgenda = (
  allEvents: CalendarEventInternal[],
  week: Week
) => {
  for (const event of allEvents) {
    const eventStart = event.start as Temporal.ZonedDateTime
    const eventEnd = event.end as Temporal.ZonedDateTime

    // Get the date range of the event (which days it spans)
    const startDate = dateFromDateTime(eventStart.toString())
    const endDate = dateFromDateTime(eventEnd.toString())

    // Convert to PlainDate for easier iteration
    const {
      year: startYear,
      month: startMonth,
      date: startDay,
    } = toIntegers(startDate)
    const { year: endYear, month: endMonth, date: endDay } = toIntegers(endDate)

    const plainStart = Temporal.PlainDate.from({
      year: startYear,
      month: startMonth + 1,
      day: startDay,
    })

    const plainEnd = Temporal.PlainDate.from({
      year: endYear,
      month: endMonth + 1,
      day: endDay,
    })

    // Iterate through each day the event spans
    let currentDate = plainStart

    while (Temporal.PlainDate.compare(currentDate, plainEnd) <= 0) {
      const dateKey = dateFromDateTime(currentDate.toString())

      // Only add to days that exist in the week
      if (week[dateKey]) {
        // Add to timeGridEvents array
        week[dateKey].timeGridEvents.push(event)
      }

      // Move to next day
      currentDate = addDays(currentDate, 1) as Temporal.PlainDate
    }
  }

  return week
}
