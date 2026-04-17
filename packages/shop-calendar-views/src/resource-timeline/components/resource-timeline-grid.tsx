import { RefObject } from 'preact'
import { useState, useCallback } from 'preact/hooks'
import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { WeekDay } from '@schedule-x/calendar/src/types/week'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import ResourceTimelineRow from './resource-timeline-row'
import { createDayBoundariesMap } from './timeline-helpers'

type props = {
  people: Array<{ id: string; name: string }>
  weekDays: WeekDay[]
  weekStart: Temporal.ZonedDateTime | null
  daysInWeek: number
  gridSteps: Array<{ hour: number; minute: number }>
  resourceRowHeight: number
  weekWidth: number
  $app: CalendarAppSingleton
  gridScrollRef: RefObject<HTMLDivElement>
  resourceNamesRef: RefObject<HTMLDivElement>
  minTimeColumnWidth: number
}

export default function ResourceTimelineGrid({
  people,
  weekDays,
  weekStart,
  daysInWeek,
  gridSteps,
  resourceRowHeight,
  weekWidth,
  $app,
  gridScrollRef,
  resourceNamesRef,
  minTimeColumnWidth,
}: props) {
  const [copyState, setCopyState] = useState<{
    event: CalendarEventInternal | undefined
    version: number
  }>({ event: undefined, version: 0 })

  const copyEvent = copyState.event

  const updateCopy = useCallback((copy: CalendarEventInternal | undefined) => {
    setCopyState((prev) => ({ event: copy, version: prev.version + 1 }))
  }, [])

  return (
    <div
      className="sx__resource-timeline-grid"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        className="sx__resource-timeline-grid-scrollable"
        style={{
          display: 'flex',
          width: '100%',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div
          ref={resourceNamesRef}
          className="sx__resource-timeline-resource-names"
          style={{
            width: '150px',
            minWidth: '150px',
            borderRight: 'var(--sx-border)',
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {people.length > 0
              ? people.map((person) => (
                  <div
                    key={person.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px 8px',
                      fontSize: 'var(--sx-font-small)',
                      fontWeight: 600,
                      color: 'var(--sx-color-neutral)',
                      borderBottom: '1px solid var(--sx-color-outline-variant)',
                      height: `${resourceRowHeight}px`,
                      minHeight: `${resourceRowHeight}px`,
                    }}
                  >
                    {person.name}
                  </div>
                ))
              : null}
          </div>
        </div>
        <div
          ref={gridScrollRef}
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: `${weekWidth}px`,
              minWidth: `${weekWidth}px`,
            }}
          >
            {people.length > 0 && weekStart
              ? (() => {
                  const dayBoundariesMap = createDayBoundariesMap(
                    weekDays,
                    $app
                  )
                  return people.map((person) => (
                    <ResourceTimelineRow
                      key={person.id}
                      person={person}
                      weekDays={weekDays}
                      weekStart={weekStart}
                      daysInWeek={daysInWeek}
                      gridSteps={gridSteps}
                      $app={$app}
                      dayBoundariesMap={dayBoundariesMap}
                      copyEvent={
                        copyEvent?.resourceId === person.id
                          ? copyEvent
                          : undefined
                      }
                      draggingEventId={copyEvent?.id}
                      updateCopy={updateCopy}
                      minTimeColumnWidth={minTimeColumnWidth}
                    />
                  ))
                })()
              : null}
          </div>
        </div>
      </div>
    </div>
  )
}
