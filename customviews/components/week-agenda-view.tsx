import { PreactViewComponent } from '@schedule-x/shared/src/types/calendar/preact-view-component'
import { AppContext } from '@schedule-x/calendar/src/utils/stateful/app-context'
import DateAxis from '@schedule-x/calendar/src/components/week-grid/date-axis'
import { createWeek } from '@schedule-x/calendar/src/utils/stateless/views/week/create-week'
import { sortEventsByStartAndEnd } from '@schedule-x/calendar/src/utils/stateless/events/sort-by-start-date'
import { useComputed } from '@preact/signals'
import WeekAgendaGridDay from './week-agenda-grid-day'
import { toIntegers } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/format-conversion'
import { positionEventsForAgenda } from '../position-events-for-agenda'

export const WeekAgendaWrapper: PreactViewComponent = ({ $app, id }) => {
  document.documentElement.style.setProperty(
    '--sx-week-grid-height',
    `${$app.config.weekOptions.value.gridHeight}px`
  )

  const week = useComputed(() => {
    const rangeStart = $app.calendarState.range.value?.start
    const rangeEnd = $app.calendarState.range.value?.end
    if (!rangeStart || !rangeEnd) return {}

    let newWeek = createWeek($app)
    const filteredEvents = $app.calendarEvents.filterPredicate.value
      ? $app.calendarEvents.list.value.filter(
          $app.calendarEvents.filterPredicate.value
        )
      : $app.calendarEvents.list.value

    // Use the new positioning function that includes both date and time grid events
    // and adds multi-day events to all days they span
    newWeek = positionEventsForAgenda(
      filteredEvents.sort(sortEventsByStartAndEnd),
      newWeek
    )

    return newWeek
  })

  return (
    <>
      <AppContext.Provider value={$app}>
        <div
          className="sx__week-agenda-wrapper"
          id={id}
          style={{ position: 'relative' }}
        >
          <div className="sx__week-header">
            <div className="sx__week-header-content">
              <DateAxis
                week={Object.values(week.value).map((day) => {
                  const plainDate = Temporal.PlainDate.from(day.date)
                  return Temporal.ZonedDateTime.from({
                    year: plainDate.year,
                    month: plainDate.month,
                    day: plainDate.day,
                    timeZone: $app.config.timezone.value,
                  })
                })}
              />
              <div className="sx__week-header-border" />
            </div>
          </div>
          <div
            className="sx__week-agenda-grid"
            style={{
              display: 'flex',
              flexShrink: 0,
              width: '100%',
              minHeight: 'var(--sx-week-grid-height)',
              position: 'relative',
              isolation: 'isolate',
            }}
          >
            <div
              className="sx__week-agenda-grid-spacer-left"
              style={{
                position: 'relative',
                width: 'var(--sx-calendar-week-grid-padding-left)',
                flexShrink: 0,
              }}
            ></div>
            {Object.values(week.value).map((day) => {
              const { year, month, date } = toIntegers(day.date)
              const zonedDateTime = Temporal.ZonedDateTime.from({
                year,
                month: month + 1,
                day: date,
                timeZone: $app.config.timezone.value,
              })
              return (
                <WeekAgendaGridDay
                  key={day.date}
                  calendarEvents={day.timeGridEvents}
                  date={zonedDateTime}
                  onClick={$app.config.callbacks.onWeekAgendaDayClick}
                />
              )
            })}
          </div>
        </div>
      </AppContext.Provider>
    </>
  )
}
