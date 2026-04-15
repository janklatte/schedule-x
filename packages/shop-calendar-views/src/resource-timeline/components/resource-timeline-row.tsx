import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { DayBoundariesDateTime } from '@schedule-x/shared/src/types/day-boundaries-date-time'
import { WeekDay } from '@schedule-x/calendar/src/types/week'
import { DayBoundariesInternal } from '@schedule-x/shared/src/types/calendar/day-boundaries'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import ResourceTimelineEvent from './resource-timeline-event'

type props = {
  person: { id: string; name: string }
  weekDays: WeekDay[]
  weekStart: Temporal.ZonedDateTime
  daysInWeek: number
  gridSteps: Array<{ hour: number; minute: number }>
  $app: CalendarAppSingleton
  dayBoundariesMap: Map<string, DayBoundariesDateTime>
  getXCoordinateInTimeline: (
    dateTime: Temporal.ZonedDateTime,
    weekStart: Temporal.ZonedDateTime,
    dayBoundaries: DayBoundariesInternal,
    pointsPerDay: number,
    daysInWeek: number
  ) => number
  getEventWidthInTimeline: (
    start: Temporal.ZonedDateTime,
    end: Temporal.ZonedDateTime,
    dayBoundaries: DayBoundariesInternal,
    pointsPerDay: number,
    daysInWeek: number
  ) => number
  copyEvent?: CalendarEventInternal
  draggingEventId?: string | number
  updateCopy: (copy: CalendarEventInternal | undefined) => void
}

export default function ResourceTimelineRow({
  person,
  weekDays,
  weekStart,
  daysInWeek,
  gridSteps,
  $app,
  dayBoundariesMap,
  getXCoordinateInTimeline,
  getEventWidthInTimeline,
  copyEvent,
  draggingEventId,
  updateCopy,
}: props) {
  const personEvents = weekDays.flatMap((day) =>
    day.timeGridEvents.filter((event) => event.resourceId?.includes(person.id))
  )

  return (
    <div
      className="sx__resource-timeline-row"
      data-person-id={person.id}
      style={{ borderBottom: '1px solid var(--sx-color-outline-variant)' }}
    >
      {weekDays.map((day, dayIdx) => {
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
          return (
            <div
              key={`grid-cell-${day.date}-${gridStep.hour}-${gridStep.minute}`}
              className="sx__resource-timeline-time-cell"
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `80px`,
                top: 0,
                bottom: 0,
                borderLeft:
                  timeSlotIdx > 0 || dayIdx > 0
                    ? '1px dashed var(--sx-color-outline-variant)'
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
            const eventStart =
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
                  backgroundColor:
                    event.style?.backgroundColor ||
                    'var(--sx-color-surface-variant)',
                  opacity: 0.3,
                  zIndex: 0,
                }}
              />
            )
          })
      )}

      {personEvents.map((event) => {
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
