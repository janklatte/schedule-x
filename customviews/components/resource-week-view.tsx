import { useComputed } from '@preact/signals'
import { PreactViewComponent } from '../create-view'
import { createWeek } from '@schedule-x/calendar/src/utils/stateless/views/week/create-week'
import { AppContext } from '@schedule-x/calendar/src/utils/stateful/app-context'
import TimeAxis from '@schedule-x/calendar/src/components/week-grid/time-axis'
import TimeGridDay from '@schedule-x/calendar/src/components/week-grid/time-grid-day'
import { sortEventsForWeekView } from '@schedule-x/calendar/src/utils/stateless/events/sort-events-for-week'
import { positionInTimeGrid } from '@schedule-x/calendar/src/utils/stateless/events/position-in-time-grid'
import { toIntegers } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/format-conversion'
import { getDayNameShort } from '@schedule-x/shared/src/utils/stateless/time/date-time-localization/date-time-localization'
import { isToday } from '@schedule-x/shared/src/utils/stateless/time/comparison'
import { getClassNameForWeekday } from '@schedule-x/calendar/src/utils/stateless/get-class-name-for-weekday'
import { toDateString } from '@schedule-x/shared/src'
import { useRef, useEffect } from 'preact/hooks'

export const ResourceWeekWrapper: PreactViewComponent = ({ $app, id }) => {
  // Set grid height
  document.documentElement.style.setProperty(
    '--sx-week-grid-height',
    `${$app.config.weekOptions.value.gridHeight}px`
  )

  // Minimum width for each resource column (in pixels)
  const MIN_RESOURCE_COLUMN_WIDTH = 150

  // Refs for scroll synchronization
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const gridScrollRef = useRef<HTMLDivElement>(null)

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

  const resourceWeekData = useComputed(() => {
    const rangeStart = $app.calendarState.range.value?.start
    const rangeEnd = $app.calendarState.range.value?.end
    if (!rangeStart || !rangeEnd) return { people: [], week: {} }

    // Get unique people from events
    const calendarEvents = $app.calendarEvents.list.value
    const uniquePeople = [
      ...new Set(calendarEvents.flatMap((event) => event.people || [])),
    ].filter(Boolean)

    // Create base week structure
    const week = createWeek($app)

    // Get filtered events
    const filteredEvents = $app.calendarEvents.filterPredicate.value
      ? calendarEvents.filter($app.calendarEvents.filterPredicate.value)
      : calendarEvents

    const { timeGridEvents } = sortEventsForWeekView(filteredEvents)

    // Position events in the time grid - same as week view
    const weekWithEvents = positionInTimeGrid(timeGridEvents, week, $app)

    return { people: uniquePeople, week: weekWithEvents }
  })

  const getClassNames = (date: Temporal.ZonedDateTime) => {
    const classNames = [
      'sx__week-grid__date',
      getClassNameForWeekday(date.dayOfWeek),
    ]
    if (isToday(date, $app.config.timezone.value)) {
      classNames.push('sx__week-grid__date--is-today')
    }
    return classNames.join(' ')
  }

  const { people, week } = resourceWeekData.value
  const weekDays = Object.values(week)

  return (
    <AppContext.Provider value={$app}>
      <>
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
                  }}
                >
                  <div
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
                        <div
                          className="sx__resource-week-day-group"
                          key={day.date}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: `${MIN_RESOURCE_COLUMN_WIDTH * (people.length || 1)}px`,
                            flex: 1,
                          }}
                        >
                          {/* Day header - merged across all resource columns */}
                          <div
                            className={getClassNames(date)}
                            data-date={toDateString(date)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              borderBottom: 'var(--sx-border)',
                              padding: '8px 0',
                              borderLeft:
                                idx > 0
                                  ? '1px dashed var(--sx-color-outline-variant)'
                                  : 'none',
                              borderImage:
                                'linear-gradient(to top, var(--sx-color-outline-variant), rgba(0, 0, 0, 0)) 1 100%',
                            }}
                            data-index={idx}
                          >
                            <div className="sx__week-grid__day-name">
                              {getDayNameShort(date, $app.config.locale.value)}
                            </div>
                            <div className="sx__week-grid__date-number">
                              {date.day}
                            </div>
                          </div>

                          {/* Resource names row below the day */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: `repeat(${people.length || 1}, 1fr)`,
                              width: '100%',
                            }}
                          >
                            {people.length > 0 ? (
                              people.map((person, personIdx) => (
                                <div
                                  key={`${day.date}-${person}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px 4px',
                                    fontSize: 'var(--sx-font-small)',
                                    fontWeight: 600,
                                    color: 'var(--sx-color-neutral)',
                                    borderLeft:
                                      '1px solid var(--sx-color-outline-variant)',
                                    borderImage:
                                      (personIdx == 0 && idx == 0) ||
                                      personIdx != 0
                                        ? 'linear-gradient(to top, var(--sx-color-outline-variant), rgba(0, 0, 0, 0)) 1 100%'
                                        : 'none',
                                  }}
                                >
                                  {person}
                                </div>
                              ))
                            ) : (
                              <div
                                style={{
                                  padding: '8px 4px',
                                  textAlign: 'center',
                                }}
                              >
                                {/* Empty placeholder when no people */}
                              </div>
                            )}
                          </div>
                        </div>
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
            <TimeAxis />

            <div
              ref={gridScrollRef}
              style={{
                overflowX: 'auto',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  minWidth: '100%',
                  height: '100%',
                }}
              >
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
                      key={day.date}
                      className="sx__resource-day-columns"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${people.length || 1}, minmax(${MIN_RESOURCE_COLUMN_WIDTH}px, 1fr))`,
                        minWidth: `${MIN_RESOURCE_COLUMN_WIDTH * (people.length || 1)}px`,
                        flex: 1,
                      }}
                    >
                      {people.length > 0 ? (
                        people.map((person) => {
                          // Filter events for this person
                          const personEvents = day.timeGridEvents.filter(
                            (event) => event.people?.includes(person)
                          )

                          return (
                            <TimeGridDay
                              key={`${day.date}-${person}`}
                              calendarEvents={personEvents}
                              backgroundEvents={day.backgroundEvents}
                              date={zonedDateTime}
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
      </>
    </AppContext.Provider>
  )
}
