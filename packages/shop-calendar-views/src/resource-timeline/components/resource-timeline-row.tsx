import { useMemo } from 'preact/hooks'
import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { DayBoundariesDateTime } from '@schedule-x/shared/src/types/day-boundaries-date-time'
import { WeekDay } from '@schedule-x/calendar/src/types/week'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import ResourceTimelineEvent from './resource-timeline-event'
import { assignTimelineEventSlots } from './timeline-helpers'
import {
  timePointsFromString,
  timeStringFromTimePoints,
} from '@schedule-x/shared/src/utils/stateless/time/time-points/string-conversion'
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

  return (
    <div
      className="sx__resource-timeline-row"
      data-person-id={person.id}
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

            // Clamp start to day boundary
            const startHour = eventStart.hour
            const startMinute = eventStart.minute
            const formattedStart = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`
            const startTimePoints = timePointsFromString(formattedStart)
            if (startTimePoints < $app.config.dayBoundaries.value.start) {
              const updatedStart = timeStringFromTimePoints(
                $app.config.dayBoundaries.value.start
              )
              const [updatedStartHour, updatedStartMinute] =
                updatedStart.split(':')
              eventStart = eventStart.with({
                hour: +updatedStartHour,
                minute: +updatedStartMinute,
                second: 0,
              })
            }

            if (eventStart.toString() === eventEnd.toString()) return null

            const left = getXCoordinateInTimeline(
              eventStart,
              weekStart,
              $app.config.dayBoundaries.value,
              $app.config.timePointsPerDay,
              daysInWeek
            )
            const width = getEventWidthInTimeline(
              eventStart,
              eventEnd,
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
