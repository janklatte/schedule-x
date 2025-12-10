import { useComputed } from '@preact/signals'
import { PreactViewComponent } from '@schedule-x/shared/src/types/calendar/preact-view-component'
import { createWeek } from '@schedule-x/calendar/src/utils/stateless/views/week/create-week'
import { AppContext } from '@schedule-x/calendar/src/utils/stateful/app-context'
import { sortEventsForWeekView } from '@schedule-x/calendar/src/utils/stateless/events/sort-events-for-week'
import { positionInTimeGrid } from '@schedule-x/calendar/src/utils/stateless/events/position-in-time-grid'
import ResourceTimelineHeader from './resource-timeline-header'
import { useRef, useEffect, useCallback } from 'preact/hooks'
import { filterByRange } from '@schedule-x/calendar/src/utils/stateless/events/filter-by-range'
import { useGridSteps } from './use-grid-steps'
import ResourceTimelineGrid from './resource-timeline-grid'

export const ResourceTimelineWrapper: PreactViewComponent = ({ $app, id }) => {
  const RESOURCE_ROW_HEIGHT = 50
  const MIN_TIME_COLUMN_WIDTH = 80
  const gridSteps = useGridSteps($app)

  // Refs for scroll synchronization
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const gridScrollRef = useRef<HTMLDivElement>(null)
  const resourceNamesRef = useRef<HTMLDivElement>(null)

  const scrollToToday = useCallback(() => {
    const day = $app.datePickerState.selectedDate.value
    const dayElement = headerScrollRef.current?.querySelector(
      `.sx__resource-timeline-day-header[data-date="${day}"]`
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

  // Synchronize vertical scroll between resource names and grid
  useEffect(() => {
    const resourceNamesEl = resourceNamesRef.current
    const gridEl = gridScrollRef.current

    if (!resourceNamesEl || !gridEl) return

    const syncResourceNamesToGrid = () => {
      if (resourceNamesEl && gridEl) {
        resourceNamesEl.scrollTop = gridEl.scrollTop
      }
    }

    const syncGridToResourceNames = () => {
      if (resourceNamesEl && gridEl) {
        gridEl.scrollTop = resourceNamesEl.scrollTop
      }
    }

    gridEl.addEventListener('scroll', syncResourceNamesToGrid)
    resourceNamesEl.addEventListener('scroll', syncGridToResourceNames)

    return () => {
      gridEl.removeEventListener('scroll', syncResourceNamesToGrid)
      resourceNamesEl.removeEventListener('scroll', syncGridToResourceNames)
    }
  }, [])

  useEffect(() => {
    scrollToToday()
  }, [$app.datePickerState.selectedDate.value])

  const resourceTimelineData = useComputed(() => {
    const rangeStart = $app.calendarState.range.value?.start
    const rangeEnd = $app.calendarState.range.value?.end
    if (!rangeStart || !rangeEnd)
      return { people: [], week: {}, weekStart: null }

    // Get unique people from resources
    const uniquePeople = Array.from($app.config.resources?.value || []).map(
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
    const calendarEvents = $app.calendarEvents.list.value
    const filteredEvents = $app.calendarEvents.filterPredicate.value
      ? calendarEvents.filter($app.calendarEvents.filterPredicate.value)
      : calendarEvents

    const { timeGridEvents } = sortEventsForWeekView(filteredEvents)

    // Position events in the time grid - same as week view
    const weekWithEvents = positionInTimeGrid(timeGridEvents, week, $app)

    // Get week start date
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
        {
          start: rangeStartDateTime,
          end: rangeEndDateTime,
        },
        $app.config.timezone.value
      )
    })

    return { people: uniquePeople, week: weekWithEvents, weekStart }
  })

  const { people, week, weekStart } = resourceTimelineData.value
  const weekDays = Object.values(week)
  const daysInWeek = weekDays.length

  // Calculate total width for the week
  const weekWidth =
    gridSteps.length > 0 && daysInWeek > 0
      ? MIN_TIME_COLUMN_WIDTH * gridSteps.length * daysInWeek
      : 0

  return (
    <>
      <AppContext.Provider value={$app}>
        <style>{`
          .sx__resource-timeline-resource-names {
            overflow-y: auto;
            overflow-x: hidden;
          }
          .sx__resource-timeline-row {
            position: relative;
            height: ${RESOURCE_ROW_HEIGHT}px;
            min-height: ${RESOURCE_ROW_HEIGHT}px;
            width: ${weekWidth}px;
            min-width: ${weekWidth}px;
          }
        `}</style>
        <div
          className="sx__resource-timeline-wrapper"
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
          id={id}
        >
          <div
            className="sx__resource-timeline-header"
            style={{
              paddingLeft: '150px',
              position: 'sticky',
              top: 0,
              zIndex: 2,
              backgroundColor: 'var(--sx-color-background)',
              borderBottom: 'var(--sx-border)',
            }}
          >
            <div
              className="sx__resource-timeline-header-content"
              style={{ position: 'relative' }}
            >
              <div className="sx__resource-timeline-date-axis">
                <div
                  ref={headerScrollRef}
                  style={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    width: '100%',
                  }}
                >
                  <div
                    className="sx__resource-timeline-day-header-container"
                    style={{
                      display: 'flex',
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
                        <ResourceTimelineHeader
                          key={day.date}
                          appConfig={$app.config}
                          day={day}
                          date={date}
                          idx={idx}
                          minTimeColumnWidth={MIN_TIME_COLUMN_WIDTH}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ResourceTimelineGrid
            people={people}
            weekDays={weekDays}
            weekStart={weekStart}
            daysInWeek={daysInWeek}
            gridSteps={gridSteps}
            minTimeColumnWidth={MIN_TIME_COLUMN_WIDTH}
            resourceRowHeight={RESOURCE_ROW_HEIGHT}
            weekWidth={weekWidth}
            $app={$app}
            gridScrollRef={gridScrollRef}
            resourceNamesRef={resourceNamesRef}
          />
        </div>
      </AppContext.Provider>
    </>
  )
}
