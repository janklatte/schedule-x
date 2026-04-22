import { useMemo, useRef } from 'preact/hooks'
import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { DayBoundariesDateTime } from '@schedule-x/shared/src/types/day-boundaries-date-time'
import { WeekDay } from '@schedule-x/calendar/src/types/week'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import ResourceTimelineEvent from './resource-timeline-event'
import {
  assignTimelineEventSlots,
  getDateTimeFromTimelineClick,
} from './timeline-helpers'
import {
  getXCoordinateInTimeline,
  getEventWidthInTimeline,
} from './timeline-helpers'
import { TimelineMode } from './use-grid-steps'

type props = {
  person: { id: string; name: string }
  weekDays: WeekDay[]
  weekStart: Temporal.ZonedDateTime
  daysInWeek: number
  gridSteps: Array<{ hour: number; minute: number }>
  $app: CalendarAppSingleton
  dayBoundariesMap: Map<string, DayBoundariesDateTime>
  copyEvent?: CalendarEventInternal
  draggingEventId?: string | number
  updateCopy: (copy: CalendarEventInternal | undefined) => void
  minTimeColumnWidth: number
  mode: TimelineMode
  snappingIntervalTP: number | undefined
}

export default function ResourceTimelineRow({
  person,
  weekDays,
  weekStart,
  daysInWeek,
  gridSteps,
  $app,
  dayBoundariesMap,
  copyEvent,
  draggingEventId,
  updateCopy,
  minTimeColumnWidth,
  mode,
  snappingIntervalTP,
}: props) {
  const eventsWithConcurrency = useMemo(
    () =>
      assignTimelineEventSlots(
        weekDays.flatMap((day) =>
          day.timeGridEvents.filter((event) =>
            event.resourceId?.includes(person.id)
          )
        )
      ),
    [weekDays]
  )

  const rowRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = (e: MouseEvent) => {
    const callback = $app.config.callbacks.onContextMenuDateTime
    if (!callback) return
    e.preventDefault()
    const dateTime = getDateTimeFromTimelineClick(
      e,
      rowRef.current as HTMLElement,
      weekStart,
      daysInWeek,
      $app
    )
    if (dateTime) callback(dateTime, e, person.id)
  }

  return (
    <div
      ref={rowRef}
      className="sx__resource-timeline-row"
      data-person-id={person.id}
      onContextMenu={handleContextMenu}
      style={{
        borderBottom: '1px solid var(--sx-color-outline-variant)',
      }}
    >
      {mode === 'day'
        ? weekDays.map((day, dayIdx) => (
            <div
              key={`grid-cell-${day.date}`}
              className="sx__resource-timeline-time-cell"
              style={{
                position: 'absolute',
                left: `${(dayIdx / daysInWeek) * 100}%`,
                width: `${100 / daysInWeek}%`,
                top: 0,
                bottom: 0,
                boxShadow:
                  dayIdx > 0
                    ? '-2px 0 0 0 var(--sx-color-outline-variant)'
                    : 'none',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
          ))
        : weekDays.map((day, dayIdx) => {
            const plainDate = Temporal.PlainDate.from(day.date)
            return gridSteps.map((gridStep, timeSlotIdx) => {
              const timeSlotDateTime = Temporal.ZonedDateTime.from({
                year: plainDate.year,
                month: plainDate.month,
                day: plainDate.day,
                hour: gridStep.hour,
                minute: gridStep.minute,
                timeZone: $app.config.timezone.value,
              })
              const left = getXCoordinateInTimeline(
                timeSlotDateTime,
                weekStart,
                $app.config.dayBoundaries.value,
                $app.config.timePointsPerDay,
                daysInWeek
              )
              const isDayBoundary = timeSlotIdx === 0 && dayIdx > 0
              return (
                <div
                  key={`grid-cell-${day.date}-${gridStep.hour}-${gridStep.minute}`}
                  className="sx__resource-timeline-time-cell"
                  style={{
                    position: 'absolute',
                    left: `${left}%`,
                    width: `${minTimeColumnWidth}px`,
                    top: 0,
                    bottom: 0,
                    boxShadow: isDayBoundary
                      ? '-2px 0 0 0 var(--sx-color-outline-variant)'
                      : 'none',
                    borderLeft:
                      !isDayBoundary && (timeSlotIdx > 0 || dayIdx > 0)
                        ? '1px solid var(--sx-color-outline-variant)'
                        : 'none',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
              )
            })
          })}

      {weekDays.flatMap((day) =>
        day.backgroundEvents
          .filter(
            (event) => event.resourceId === person.id || !event.resourceId
          )
          .map((event, bgEventIdx) => {
            let eventStart =
              event.start instanceof Temporal.ZonedDateTime
                ? event.start
                : event.start.toZonedDateTime($app.config.timezone.value)
            const eventEnd =
              event.end instanceof Temporal.ZonedDateTime
                ? event.end
                : event.end.toZonedDateTime($app.config.timezone.value).with({
                    hour: 23,
                    minute: 59,
                    second: 59,
                  })

            // Clamp start to day boundary start
            const startDayDate = Temporal.PlainDate.from(eventStart).toString()
            const startDayBoundaries = dayBoundariesMap.get(startDayDate)
            if (
              startDayBoundaries &&
              Temporal.ZonedDateTime.compare(
                eventStart,
                startDayBoundaries.start
              ) < 0
            ) {
              eventStart = startDayBoundaries.start
            }

            // Clamp end to end-day boundary end
            const endDayDate = Temporal.PlainDate.from(eventEnd).toString()
            const endDayBoundaries = dayBoundariesMap.get(endDayDate)
            let effectiveBgEnd = eventEnd
            if (endDayBoundaries) {
              if (
                Temporal.ZonedDateTime.compare(eventEnd, endDayBoundaries.end) >
                0
              ) {
                effectiveBgEnd = endDayBoundaries.end
              } else if (
                Temporal.ZonedDateTime.compare(
                  eventEnd,
                  endDayBoundaries.start
                ) <= 0
              ) {
                // End is before the start boundary of its day (e.g. midnight with 08:00 boundary).
                // Use the previous day's end boundary instead.
                const prevDayDate = Temporal.PlainDate.from(eventEnd)
                  .subtract({ days: 1 })
                  .toString()
                const prevDayBoundaries = dayBoundariesMap.get(prevDayDate)
                if (prevDayBoundaries) effectiveBgEnd = prevDayBoundaries.end
              }
            }

            if (Temporal.ZonedDateTime.compare(eventStart, effectiveBgEnd) >= 0)
              return null

            const left = getXCoordinateInTimeline(
              eventStart,
              weekStart,
              $app.config.dayBoundaries.value,
              $app.config.timePointsPerDay,
              daysInWeek
            )
            const width = getEventWidthInTimeline(
              eventStart,
              effectiveBgEnd,
              $app.config.dayBoundaries.value,
              $app.config.timePointsPerDay,
              daysInWeek
            )
            return (
              <div
                key={`bg-${day.date}-${person.id}-${bgEventIdx}`}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  width: `${width}%`,
                  top: 0,
                  height: '100%',
                  zIndex: 0,
                  ...event.style,
                }}
              />
            )
          })
      )}

      {eventsWithConcurrency.map((event) => {
        if (draggingEventId === event.id) return null
        return (
          <ResourceTimelineEvent
            key={event.id}
            event={event}
            weekStart={weekStart}
            daysInWeek={daysInWeek}
            dayBoundariesMap={dayBoundariesMap}
            getXCoordinateInTimeline={getXCoordinateInTimeline}
            getEventWidthInTimeline={getEventWidthInTimeline}
            $app={$app}
            updateCopy={updateCopy}
            snappingIntervalTP={snappingIntervalTP}
          />
        )
      })}

      {copyEvent && (
        <ResourceTimelineEvent
          key="copy"
          event={copyEvent}
          weekStart={weekStart}
          daysInWeek={daysInWeek}
          dayBoundariesMap={dayBoundariesMap}
          getXCoordinateInTimeline={getXCoordinateInTimeline}
          getEventWidthInTimeline={getEventWidthInTimeline}
          $app={$app}
          isCopy
        />
      )}
    </div>
  )
}
