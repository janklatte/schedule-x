import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { DayBoundariesDateTime } from '@schedule-x/shared/src/types/day-boundaries-date-time'
import { WeekDay } from '@schedule-x/calendar/src/types/week'
import { DayBoundariesInternal } from '@schedule-x/shared/src/types/calendar/day-boundaries'
import { useEffect, useRef } from 'preact/hooks'
import { invokeOnEventClickCallback } from '@schedule-x/calendar/src/utils/stateless/events/invoke-on-event-click-callback'
import { getElementByCCID } from '@schedule-x/calendar/src/utils/stateless/dom/getters'
import { randomStringId } from '@schedule-x/shared/src/utils/stateless/strings/random'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'

type props = {
  person: { id: string; name: string }
  weekDays: WeekDay[]
  weekStart: Temporal.ZonedDateTime
  daysInWeek: number
  gridSteps: Array<{ hour: number; minute: number }>
  resourceRowHeight: number
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
}

type ResourceTimelineEventProps = {
  event: CalendarEventInternal
  weekStart: Temporal.ZonedDateTime
  daysInWeek: number
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
  $app: CalendarAppSingleton
}

function ResourceTimelineEvent({
  event,
  weekStart,
  daysInWeek,
  dayBoundariesMap,
  getXCoordinateInTimeline,
  getEventWidthInTimeline,
  $app,
}: ResourceTimelineEventProps) {
  const eventStart = event.start as Temporal.ZonedDateTime
  const eventEnd = event.end as Temporal.ZonedDateTime
  const dayDate = Temporal.PlainDate.from(eventStart).toString()
  const dayBoundaries = dayBoundariesMap.get(dayDate)

  if (!dayBoundaries) return null

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

  const customComponent = $app.config._customComponentFns.resourceTimelineEvent
  const customComponentId = useRef(
    customComponent
      ? 'custom-resource-timeline-event-' + randomStringId()
      : undefined
  )

  useEffect(() => {
    if (!customComponent) return

    customComponent(getElementByCCID(customComponentId.current), {
      calendarEvent: event._getExternalEvent(),
    })

    return () => {
      $app.config._destroyCustomComponentInstance?.(
        customComponentId.current as string
      )
    }
  }, [event, customComponent])

  const handleOnClick = (e: MouseEvent) => {
    e.stopPropagation()
    invokeOnEventClickCallback($app, event, e)
  }

  const eventColor = event._color || 'primary'
  const eventCSSVariables = {
    backgroundColor: `var(--sx-color-${eventColor}-container)`,
    textColor: `var(--sx-color-on-${eventColor}-container)`,
    borderColor: `var(--sx-color-${eventColor})`,
  }

  return (
    <div
      data-event-id={event.id}
      data-ccid={customComponentId.current}
      onClick={handleOnClick}
      style={{
        position: 'absolute',
        left: `${left}%`,
        width: `${width}%`,
        top: 0,
        height: '100%',
        backgroundColor: customComponent
          ? undefined
          : eventCSSVariables.backgroundColor,
        color: customComponent ? undefined : eventCSSVariables.textColor,
        borderLeft: customComponent
          ? undefined
          : `4px solid ${eventCSSVariables.borderColor}`,
        padding: customComponent ? '0' : '2px 4px',
        fontSize: 'var(--sx-font-small)',
        overflow: 'hidden',
        borderRadius: '2px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 1,
        cursor: 'pointer',
      }}
      title={event.title}
      tabIndex={0}
      role="button"
    >
      {!customComponent && event.title}
    </div>
  )
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
}: props) {
  const personEvents = weekDays.flatMap((day) =>
    day.timeGridEvents.filter((event) => event.resourceId?.includes(person.id))
  )

  return (
    <div
      key={person.id}
      className="sx__resource-timeline-row"
      style={{
        borderBottom: '1px solid var(--sx-color-outline-variant)',
      }}
    >
      {/* Grid Cells - cell divs for each time slot matching header columns */}
      {weekDays.map((day, dayIdx) => {
        const plainDate = Temporal.PlainDate.from(day.date)
        return gridSteps.map((gridStep, timeSlotIdx) => {
          // Create a datetime for this time slot to calculate its position
          const timeSlotDateTime = Temporal.ZonedDateTime.from({
            year: plainDate.year,
            month: plainDate.month,
            day: plainDate.day,
            hour: gridStep.hour,
            minute: gridStep.minute,
            timeZone: $app.config.timezone.value,
          })

          // Calculate the left position using the same logic as events
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

      {/* Background events */}
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

      {/* Time grid events */}
      {personEvents.map((event) => {
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
          />
        )
      })}
    </div>
  )
}
