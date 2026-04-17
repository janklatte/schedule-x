import { useComputed } from '@preact/signals'
import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { createWeek } from '@schedule-x/calendar/src/utils/stateless/views/week/create-week'
import { sortEventsForWeekView } from '@schedule-x/calendar/src/utils/stateless/events/sort-events-for-week'
import { positionInTimeGrid } from '@schedule-x/calendar/src/utils/stateless/events/position-in-time-grid'
import { filterByRange } from '@schedule-x/calendar/src/utils/stateless/events/filter-by-range'
import { clampEventToRange } from './timeline-helpers'

export const useResourceTimelineData = ($app: CalendarAppSingleton) => {
  const resourceTimelineData = useComputed(() => {
    const rangeStart = $app.calendarState.range.value?.start
    const rangeEnd = $app.calendarState.range.value?.end
    if (!rangeStart || !rangeEnd)
      return { people: [], week: {}, weekStart: null }

    const uniquePeople = Array.from($app.config.resources?.value || []).map(
      ([key, value]) => ({ id: key, name: value })
    )

    const week = createWeek($app)

    const calendarEvents = $app.calendarEvents.list.value
    const filteredEvents = $app.calendarEvents.filterPredicate.value
      ? calendarEvents.filter($app.calendarEvents.filterPredicate.value)
      : calendarEvents

    const { timeGridEvents, dateGridEvents } =
      sortEventsForWeekView(filteredEvents)
    const weekWithEvents = positionInTimeGrid(timeGridEvents, week, $app)
    dateGridEvents
      .filter((e) => e._isMultiDayTimed)
      .forEach((event) => {
        const clamped = clampEventToRange(event, rangeStart, rangeEnd)
        if (!clamped) return
        const dateKey = Temporal.PlainDate.from(
          clamped.start as Temporal.ZonedDateTime
        ).toString()
        weekWithEvents[dateKey]?.timeGridEvents.push(clamped)
      })

    const weekDays = Object.values(weekWithEvents)
    const weekStartDate =
      weekDays.length > 0 ? Temporal.PlainDate.from(weekDays[0].date) : null
    const weekStart = weekStartDate
      ? Temporal.ZonedDateTime.from({
          year: weekStartDate.year,
          month: weekStartDate.month,
          day: weekStartDate.day,
          hour: 0,
          minute: 0,
          second: 0,
          timeZone: $app.config.timezone.value,
        })
      : null

    Object.entries(weekWithEvents).forEach(([date, day]) => {
      const plainDate = Temporal.PlainDate.from(date)
      const rangeStartDateTime = Temporal.ZonedDateTime.from({
        year: plainDate.year,
        month: plainDate.month,
        day: plainDate.day,
        hour:
          $app.config.dayBoundaries.value.start === 0
            ? 0
            : $app.config.dayBoundaries.value.start / 100,
        minute: 0,
        second: 0,
        timeZone: $app.config.timezone.value,
      })
      let rangeEndDateTime = Temporal.ZonedDateTime.from({
        year: plainDate.year,
        month: plainDate.month,
        day: plainDate.day,
        hour:
          $app.config.dayBoundaries.value.end === 2400
            ? 23
            : $app.config.dayBoundaries.value.end / 100,
        minute: $app.config.dayBoundaries.value.end === 2400 ? 59 : 0,
        second: $app.config.dayBoundaries.value.end === 2400 ? 59 : 0,
        timeZone: $app.config.timezone.value,
      })
      if ($app.config.isHybridDay) {
        rangeEndDateTime = rangeEndDateTime.add({ days: 1 })
      }

      day.backgroundEvents = filterByRange(
        $app.calendarEvents.backgroundEvents.value,
        { start: rangeStartDateTime, end: rangeEndDateTime },
        $app.config.timezone.value
      )
    })

    return { people: uniquePeople, week: weekWithEvents, weekStart }
  })

  return resourceTimelineData.value
}
