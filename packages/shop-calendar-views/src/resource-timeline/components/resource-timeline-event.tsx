import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { DayBoundariesDateTime } from '@schedule-x/shared/src/types/day-boundaries-date-time'
import { DayBoundariesInternal } from '@schedule-x/shared/src/types/calendar/day-boundaries'
import { useEffect, useRef } from 'preact/hooks'
import { invokeOnEventClickCallback } from '@schedule-x/calendar/src/utils/stateless/events/invoke-on-event-click-callback'
import { getElementByCCID } from '@schedule-x/calendar/src/utils/stateless/dom/getters'
import { randomStringId } from '@schedule-x/shared/src/utils/stateless/strings/random'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import { deepCloneEvent } from '@schedule-x/shared/src/utils/stateless/calendar/deep-clone-event'
import { getEventCoordinates } from '@schedule-x/shared/src/utils/stateless/dom/get-event-coordinates'

export type ResourceTimelineEventProps = {
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
  isCopy?: boolean
  updateCopy?: (copy: CalendarEventInternal | undefined) => void
  snappingIntervalTP?: number
}

export default function ResourceTimelineEvent({
  event,
  weekStart,
  daysInWeek,
  dayBoundariesMap,
  getXCoordinateInTimeline,
  getEventWidthInTimeline,
  $app,
  isCopy,
  updateCopy,
  snappingIntervalTP,
}: ResourceTimelineEventProps) {
  const eventStart = event.start as Temporal.ZonedDateTime
  const eventEnd = event.end as Temporal.ZonedDateTime
  const dayDate = Temporal.PlainDate.from(eventStart).toString()
  const dayBoundaries = dayBoundariesMap.get(dayDate)

  if (!dayBoundaries) return null

  // Clamp start to the day boundary start
  const effectiveStart =
    Temporal.ZonedDateTime.compare(eventStart, dayBoundaries.start) < 0
      ? dayBoundaries.start
      : eventStart

  // Clamp end to the end day's boundary end
  const endDayDate = Temporal.PlainDate.from(eventEnd).toString()
  const endDayBoundaries = dayBoundariesMap.get(endDayDate)
  let effectiveEnd = eventEnd
  if (endDayBoundaries) {
    if (Temporal.ZonedDateTime.compare(eventEnd, endDayBoundaries.end) > 0) {
      effectiveEnd = endDayBoundaries.end
    } else if (
      Temporal.ZonedDateTime.compare(eventEnd, endDayBoundaries.start) <= 0
    ) {
      // End is before the start boundary of its day (e.g. midnight with 08:00 boundary).
      // Use the previous day's end boundary instead.
      const prevDayDate = Temporal.PlainDate.from(eventEnd)
        .subtract({ days: 1 })
        .toString()
      const prevDayBoundaries = dayBoundariesMap.get(prevDayDate)
      if (prevDayBoundaries) effectiveEnd = prevDayBoundaries.end
    }
  }

  if (Temporal.ZonedDateTime.compare(effectiveStart, effectiveEnd) >= 0)
    return null

  const left = getXCoordinateInTimeline(
    effectiveStart,
    weekStart,
    $app.config.dayBoundaries.value,
    $app.config.timePointsPerDay,
    daysInWeek
  )
  const width = getEventWidthInTimeline(
    effectiveStart,
    effectiveEnd,
    $app.config.dayBoundaries.value,
    $app.config.timePointsPerDay,
    daysInWeek
  )

  const prevConcurrent = event._previousConcurrentEvents ?? 0
  const totalConcurrent = event._totalConcurrentEvents ?? 1
  const maxConcurrent = event._maxConcurrentEvents ?? 1
  const topPercent =
    totalConcurrent > 1 ? (prevConcurrent / totalConcurrent) * 100 : 0
  const heightPercent = totalConcurrent > 1 ? 100 / maxConcurrent : 100

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
    if (isCopy) return
    e.stopPropagation()
    invokeOnEventClickCallback($app, event, e)
  }

  const dragStartTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelDragTimeout = () => {
    if (dragStartTimeout.current) {
      clearTimeout(dragStartTimeout.current)
      dragStartTimeout.current = null
    }
  }

  const handleStartDrag = (uiEvent: UIEvent) => {
    if (!$app.config.plugins.dragAndDrop) return
    if (event._options?.disableDND) return
    if (!updateCopy) return

    const originalEvent =
      $app.calendarEvents.list.value.find((e) => e.id === event.id) ?? event
    const copy = deepCloneEvent(originalEvent, $app)
    updateCopy(copy)
    $app.config.plugins.dragAndDrop.createTimelineDragHandler({
      $app,
      eventCoordinates: getEventCoordinates(uiEvent),
      eventCopy: copy,
      updateCopy,
      customIntervalTP: snappingIntervalTP,
    })
  }

  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    if (isCopy) return
    if (e instanceof MouseEvent && e.button === 2) return
    e.stopPropagation()

    dragStartTimeout.current = setTimeout(() => handleStartDrag(e), 300)
    document.addEventListener('mouseup', cancelDragTimeout, { once: true })
    document.addEventListener('touchend', cancelDragTimeout, { once: true })
  }

  const startResize = (e: MouseEvent | TouchEvent) => {
    if (isCopy) return
    if (e instanceof MouseEvent && e.button === 2) return
    e.stopPropagation()
    if (!updateCopy) return
    if (!$app.config.plugins.resize) return
    if (event._options?.disableResize) return

    const originalEvent =
      $app.calendarEvents.list.value.find((e) => e.id === event.id) ?? event
    const copy = deepCloneEvent(originalEvent, $app)
    updateCopy(copy)
    $app.config.plugins.resize.createTimelineEventResizer(
      copy,
      updateCopy,
      e,
      snappingIntervalTP
    )
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
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      style={{
        position: 'absolute',
        left: `${left}%`,
        width: `${width}%`,
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
        backgroundColor: customComponent
          ? undefined
          : eventCSSVariables.backgroundColor,
        color: customComponent ? undefined : eventCSSVariables.textColor,
        borderLeft: customComponent
          ? undefined
          : `4px solid ${eventCSSVariables.borderColor}`,
        borderTop: event._previousConcurrentEvents
          ? '1px solid #fff'
          : undefined,
        padding: customComponent ? '0' : '2px 4px',
        fontSize: 'var(--sx-font-small)',
        overflow: 'hidden',
        borderRadius: '2px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 1,
        cursor: isCopy ? 'grabbing' : 'pointer',
        opacity: isCopy ? 0.6 : 1,
        pointerEvents: isCopy ? 'none' : undefined,
        userSelect: 'none',
      }}
      title={event.title}
      tabIndex={isCopy ? -1 : 0}
      role="button"
    >
      {!customComponent && event.title}

      {!isCopy &&
        $app.config.plugins.resize &&
        !event._options?.disableResize && (
          <div
            onMouseDown={(e) => startResize(e as MouseEvent)}
            onTouchStart={(e) => startResize(e as TouchEvent)}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 'clamp(8px, 12px, 30%)',
              height: '100%',
              cursor: 'ew-resize',
              touchAction: 'none',
              zIndex: 2,
            }}
          />
        )}
    </div>
  )
}
