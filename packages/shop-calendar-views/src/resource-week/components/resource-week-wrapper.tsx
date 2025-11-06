import { useComputed } from '@preact/signals'
import { PreactViewComponent } from '@schedule-x/shared/src/types/calendar/preact-view-component'
import { createWeek } from '@schedule-x/calendar/src/utils/stateless/views/week/create-week'
import { AppContext } from '@schedule-x/calendar/src/utils/stateful/app-context'
import TimeAxis from '@schedule-x/calendar/src/components/week-grid/time-axis'
import TimeGridDay from '@schedule-x/calendar/src/components/week-grid/time-grid-day'
import { sortEventsForWeekView } from '@schedule-x/calendar/src/utils/stateless/events/sort-events-for-week'
import { positionInTimeGrid } from '@schedule-x/calendar/src/utils/stateless/events/position-in-time-grid'
import { toIntegers } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/format-conversion'
import ResourceWeekDayHeader from './resource-week-day-header'
import { useRef, useEffect, useCallback } from 'preact/hooks'
import { filterByRange } from '@schedule-x/calendar/src/utils/stateless/events/filter-by-range'

export const ResourceWeekWrapper: PreactViewComponent = ({ $app, id }) => {
  // Set grid height
  const sliderHeight = 12
  document.documentElement.style.setProperty(
    '--sx-week-grid-height',
    `${$app.config.weekOptions.value.gridHeight + sliderHeight}px`
  )

  // Minimum width for each resource column (in pixels)
  const MIN_RESOURCE_COLUMN_WIDTH = 150

  // Refs for scroll synchronization
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const gridScrollRef = useRef<HTMLDivElement>(null)

  const scrollToToday = useCallback(() => {
    const day = $app.datePickerState.selectedDate.value
    const dayElement = headerScrollRef.current?.querySelector(
      `.sx__week-grid__date[data-date="${day}"]`
    )

    if (dayElement && gridScrollRef.current && headerScrollRef.current) {
      const left =
        dayElement.getBoundingClientRect().left -
        headerScrollRef.current.getBoundingClientRect().left +
        headerScrollRef.current.scrollLeft
      gridScrollRef.current.scrollTo({ top: 0, left: left, behavior: 'auto' })
      headerScrollRef.current.scrollTo({
        top: 0,
        left: left,
        behavior: 'auto',
      })
    }
  }, [])

  // Synchronize scroll between header and grid
  useEffect(() => {
    const headerEl = headerScrollRef.current
    const gridEl = gridScrollRef.current

    if (!headerEl || !gridEl) return

    const syncHeaderToGrid = () => {
      if (headerEl && gridEl) {
        headerEl.scrollLeft = gridEl.scrollLeft
      }
    }

    const syncGridToHeader = () => {
      if (headerEl && gridEl) {
        gridEl.scrollLeft = headerEl.scrollLeft
      }
    }

    gridEl.addEventListener('scroll', syncHeaderToGrid)
    headerEl.addEventListener('scroll', syncGridToHeader)

    return () => {
      gridEl.removeEventListener('scroll', syncHeaderToGrid)
      headerEl.removeEventListener('scroll', syncGridToHeader)
    }
  }, [])

  useEffect(() => {
    scrollToToday()
  }, [$app.datePickerState.selectedDate.value])

  const resourceWeekData = useComputed(() => {
    const rangeStart = $app.calendarState.range.value?.start
    const rangeEnd = $app.calendarState.range.value?.end
    if (!rangeStart || !rangeEnd) return { people: [], week: {} }

    // Get unique people from events
    const calendarEvents = $app.calendarEvents.list.value
    const uniquePeople = Array.from($app.config.resources?.value).map(
      ([key, value]) => {
        return {
          id: key,
          name: value,
        }
      }
    )

    // Create base week structure
    const week = createWeek($app)

    // Get filtered events
    const filteredEvents = $app.calendarEvents.filterPredicate.value
      ? calendarEvents.filter($app.calendarEvents.filterPredicate.value)
      : calendarEvents

    const { timeGridEvents } = sortEventsForWeekView(filteredEvents)

    // Position events in the time grid - same as week view
    const weekWithEvents = positionInTimeGrid(timeGridEvents, week, $app)

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
        {
          start: rangeStartDateTime,
          end: rangeEndDateTime,
        },
        $app.config.timezone.value
      )
    })

    return { people: uniquePeople, week: weekWithEvents }
  })

  const { people, week } = resourceWeekData.value
  const weekDays = Object.values(week)

  return (
    <>
      <AppContext.Provider value={$app}>
        <style>{`
          .sx__resource-week-date-axis::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="sx__resource-week-wrapper sx__week-wrapper" id={id}>
          {/* Header with date axis showing days and resources */}
          <div className="sx__week-header">
            <div className="sx__week-header-content">
              <div className="sx__week-grid__date-axis sx__resource-week-date-axis">
                <div
                  ref={headerScrollRef}
                  style={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none', // IE/Edge
                    width: '100%',
                  }}
                >
                  <div
                    className="sx__resource-week-day-header-container"
                    style={{
                      display: 'flex',
                      minWidth: '100%',
                    }}
                  >
                    {weekDays.map((day, idx) => {
                      const plainDate = Temporal.PlainDate.from(day.date)
                      const date = Temporal.ZonedDateTime.from({
                        year: plainDate.year,
                        month: plainDate.month,
                        day: plainDate.day,
                        timeZone: $app.config.timezone.value,
                      })

                      return (
                        <ResourceWeekDayHeader
                          appConfig={$app.config}
                          day={day}
                          people={people.map((person) => person.name)}
                          date={date}
                          idx={idx}
                          minResourceColumnWidth={MIN_RESOURCE_COLUMN_WIDTH}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="sx__week-header-border" />
            </div>
          </div>

          {/* Time grid with resource columns */}

          <div className="sx__week-grid">
            <div
              className="sx__week-grid-scrollable"
              ref={gridScrollRef}
              style={{
                overflowX: 'auto',
                overflowY: 'hidden',
                width: '100%',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  minWidth: '100%',
                  width: '100%',
                  height: '100%',
                }}
              >
                <TimeAxis />
                {weekDays.map((day) => {
                  const { year, month, date } = toIntegers(day.date)
                  const zonedDateTime = Temporal.ZonedDateTime.from({
                    year,
                    month: month + 1,
                    day: date,
                    timeZone: $app.config.timezone.value,
                  })

                  return (
                    <div
                      key={day.date + '-resource-day-columns'}
                      className="sx__resource-day-columns"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${people.length || 1}, minmax(${MIN_RESOURCE_COLUMN_WIDTH}px, 1fr))`,
                        minWidth: `${MIN_RESOURCE_COLUMN_WIDTH * (people.length || 1)}px`,
                        flex: 1,
                        width: '100%',
                      }}
                    >
                      {people.length > 0 ? (
                        people.map((person, person_idx) => {
                          // Filter events for this person
                          const personEvents = day.timeGridEvents.filter(
                            (event) => event.resourceId?.includes(person.id)
                          )

                          return (
                            <TimeGridDay
                              key={`${day.date}-${person.id}`}
                              calendarEvents={personEvents}
                              backgroundEvents={day.backgroundEvents}
                              date={zonedDateTime}
                              resourceId={person.id}
                              isFirstResourceGrid={person_idx == 0}
                            />
                          )
                        })
                      ) : (
                        <TimeGridDay
                          calendarEvents={day.timeGridEvents}
                          backgroundEvents={day.backgroundEvents}
                          date={zonedDateTime}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </AppContext.Provider>
    </>
  )
}
