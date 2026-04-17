import { PreactViewComponent } from '@schedule-x/shared/src/types/calendar/preact-view-component'
import { AppContext } from '@schedule-x/calendar/src/utils/stateful/app-context'
import ResourceTimelineHeader from './resource-timeline-header'
import { useGridSteps, TimelineMode } from './use-grid-steps'
import ResourceTimelineGrid from './resource-timeline-grid'
import { useTimelineScroll } from './use-timeline-scroll'
import { useResourceTimelineData } from './use-resource-timeline-data'
import { CalendarAppSingleton } from '@schedule-x/shared/src'

const RESOURCE_ROW_HEIGHT = 75
const MIN_TIME_COLUMN_WIDTH = 80
export const DAY_MIN_COLUMN_WIDTH = 150

type CoreProps = {
  $app: CalendarAppSingleton
  id: string | undefined
  mode: TimelineMode
}

function ResourceTimelineCore({ $app, id, mode }: CoreProps) {
  const gridSteps = useGridSteps($app, mode)

  const {
    headerScrollRef,
    gridScrollRef,
    resourceNamesRef,
    gridScrollbarWidth,
  } = useTimelineScroll($app)

  const { people, week, weekStart } = useResourceTimelineData($app)
  const weekDays = Object.values(week)
  const daysInWeek = weekDays.length

  // Calculate total width for the week
  const weekWidth =
    mode === 'day'
      ? DAY_MIN_COLUMN_WIDTH * daysInWeek
      : gridSteps.length > 0 && daysInWeek > 0
        ? MIN_TIME_COLUMN_WIDTH * gridSteps.length * daysInWeek
        : 0

  const snappingIntervalTP = undefined

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
            width: ${mode === 'day' ? '100%' : `${weekWidth}px`};
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
              paddingRight: `${gridScrollbarWidth}px`,
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
                          gridSteps={gridSteps}
                          mode={mode}
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
            resourceRowHeight={RESOURCE_ROW_HEIGHT}
            weekWidth={weekWidth}
            $app={$app}
            gridScrollRef={gridScrollRef}
            resourceNamesRef={resourceNamesRef}
            minTimeColumnWidth={MIN_TIME_COLUMN_WIDTH}
            mode={mode}
            snappingIntervalTP={snappingIntervalTP}
          />
        </div>
      </AppContext.Provider>
    </>
  )
}

export const createResourceTimelineWrapper = (
  mode: TimelineMode
): PreactViewComponent =>
  function ResourceTimelineWrapper({ $app, id }) {
    return <ResourceTimelineCore $app={$app} id={id} mode={mode} />
  }

export const ResourceTimelineWrapper: PreactViewComponent =
  createResourceTimelineWrapper('time')
