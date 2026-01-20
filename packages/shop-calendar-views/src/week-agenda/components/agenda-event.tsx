import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import { useContext, useEffect, useRef } from 'preact/hooks'
import { AppContext } from '@schedule-x/calendar/src/utils/stateful/app-context'
import TimeIcon from '@schedule-x/shared/src/components/icons/time-icon'
import LocationPinIcon from '@schedule-x/shared/src/components/icons/location-pin-icon'
import UserIcon from '@schedule-x/shared/src/components/icons/user-icon'
import { concatenatePeople } from '@schedule-x/shared/src/utils/stateless/strings/concatenate-people'
import { invokeOnEventClickCallback } from '@schedule-x/calendar/src/utils/stateless/events/invoke-on-event-click-callback'
import { invokeOnEventContextMenuCallback } from '@schedule-x/calendar/src/utils/stateless/events/invoke-on-event-context-menu-callback'
import { getCCID } from '@schedule-x/calendar/src/components/week-grid/time-grid-event-utils'
import { getElementByCCID } from '@schedule-x/calendar/src/utils/stateless/dom/getters'
import { Fragment } from 'preact'
import { deepCloneEvent } from '@schedule-x/shared/src/utils/stateless/calendar/deep-clone-event'
import { getEventCoordinates } from '@schedule-x/shared/src/utils/stateless/dom/get-event-coordinates'
import { isUIEventTouchEvent } from '@schedule-x/shared/src/utils/stateless/dom/is-touch-event'
import useEventInteractions from '@schedule-x/calendar/src/utils/stateful/hooks/use-event-interactions'
import { getTimeGridEventCopyElementId } from '@schedule-x/shared/src/utils/stateless/strings/selector-generators'
import { nextTick } from '@schedule-x/shared/src/utils/stateless/next-tick'

type props = {
  isCopy: boolean
  calendarEvent: CalendarEventInternal
  setMouseDown?: (value: boolean) => void
}

export default function AgendaEvent({
  isCopy,
  calendarEvent,
  setMouseDown,
}: props) {
  const $app = useContext(AppContext)

  const {
    eventCopy,
    updateCopy,
    createDragStartTimeout,
    setClickedEventIfNotDragging,
  } = useEventInteractions($app)

  const localizeArgs = [
    $app.config.locale.value,
    { hour: 'numeric', minute: 'numeric' },
  ] as const

  const getEventTime = (
    start: Temporal.ZonedDateTime,
    end: Temporal.ZonedDateTime
  ) => {
    const localizedStartTime = start.toLocaleString(...localizeArgs)

    if (start === end) {
      return localizedStartTime
    }

    const localizedEndTime = end.toLocaleString(...localizeArgs)
    return `${localizedStartTime} – ${localizedEndTime}`
  }

  const eventTime = getEventTime(
    calendarEvent.start as Temporal.ZonedDateTime,
    calendarEvent.end as Temporal.ZonedDateTime
  )

  const eventCSSVariables = {
    borderInlineStart: `4px solid var(--sx-color-${calendarEvent._color})`,
    color: `var(--sx-color-on-${calendarEvent._color}-container)`,
    backgroundColor: `var(--sx-color-${calendarEvent._color}-container)`,
  } as const

  const handleStartDrag = (uiEvent: UIEvent) => {
    if (!$app.config.plugins.dragAndDrop) return
    if (calendarEvent._options?.disableDND) return
    if (isUIEventTouchEvent(uiEvent)) uiEvent.preventDefault()

    const newEventCopy = deepCloneEvent(calendarEvent, $app)
    updateCopy(newEventCopy)

    $app.config.plugins.dragAndDrop.createDateGridDragHandler({
      eventCoordinates: getEventCoordinates(uiEvent),
      eventCopy: newEventCopy,
      updateCopy: updateCopy,
      $app,
    })
  }

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    invokeOnEventClickCallback($app, calendarEvent, e)
  }

  const handleContextMenu = (e: MouseEvent) => {
    e.stopPropagation()
    invokeOnEventContextMenuCallback($app, calendarEvent, e)
  }

  const hasLocation = calendarEvent.location

  const customComponent = $app.config._customComponentFns.timeGridEvent
  const customComponentId = useRef(getCCID(customComponent, false))

  useEffect(() => {
    if (!customComponent) return

    customComponent(getElementByCCID(customComponentId.current), {
      calendarEvent: calendarEvent._getExternalEvent(),
    })

    return () => {
      $app.config._destroyCustomComponentInstance?.(
        customComponentId.current as string
      )
    }
  }, [calendarEvent])

  const hasCustomContent = calendarEvent._customContent?.timeGrid

  const handlePointerDown = (e: UIEvent) => {
    // Don't start dragging if right mouse button is clicked
    if (!isUIEventTouchEvent(e) && (e as MouseEvent).button === 2) {
      return
    }
    if (setMouseDown) setMouseDown(true)
    createDragStartTimeout(handleStartDrag, e)
  }

  const handlePointerUp = (e: UIEvent) => {
    if (setMouseDown) {
      nextTick(() => setMouseDown(false))
    }
    setClickedEventIfNotDragging(calendarEvent, e)
  }

  return (
    <>
      <div
        id={
          isCopy ? getTimeGridEventCopyElementId(calendarEvent.id) : undefined
        }
        className="sx__agenda-event sx__event"
        data-event-id={calendarEvent.id}
        style={{
          borderInlineStart: customComponent
            ? undefined
            : eventCSSVariables.borderInlineStart,
          backgroundColor: customComponent
            ? undefined
            : eventCSSVariables.backgroundColor,
          color: customComponent ? undefined : eventCSSVariables.color,
          padding: customComponent ? '0' : '8px 12px',
          marginBottom: '8px',
          borderRadius: '4px',
          cursor: 'pointer',
          display: eventCopy ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontSize: 'var(--sx-font-extra-small)',
          webkitUserSelect: 'none',
          userSelect: 'none',
          position: isCopy ? 'absolute' : 'relative',
          zIndex: isCopy ? 1 : undefined,
          opacity: isCopy ? 0.5 : undefined,
          boxShadow: isCopy ? 'var(--sx-box-shadow-level3)' : undefined,
          transition: isCopy ? 'transform 0.15s ease-in-out' : undefined,
          width: isCopy ? 'calc(100% - 12px)' : undefined,
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
      >
        <div
          data-ccid={customComponentId.current}
          className="sx__agenda-event-inner"
        >
          {!customComponent && !hasCustomContent && (
            <Fragment>
              <div className="sx__time-grid-event-title">
                {calendarEvent.title}
              </div>

              <div className="sx__time-grid-event-time">
                <TimeIcon strokeColor={eventCSSVariables.color} />
                <span>{eventTime}</span>
              </div>

              {hasLocation && (
                <div className="sx__time-grid-event-location">
                  <LocationPinIcon strokeColor={eventCSSVariables.color} />
                  {calendarEvent.location}
                </div>
              )}

              {calendarEvent.people && calendarEvent.people.length > 0 && (
                <div className="sx__time-grid-event-people">
                  <UserIcon strokeColor={eventCSSVariables.color} />
                  {concatenatePeople(calendarEvent.people)}
                </div>
              )}
            </Fragment>
          )}

          {hasCustomContent && (
            <div
              dangerouslySetInnerHTML={{
                __html: calendarEvent._customContent?.timeGrid || '',
              }}
            />
          )}
        </div>
      </div>
      {eventCopy && (
        <AgendaEvent
          isCopy={true}
          calendarEvent={eventCopy}
          setMouseDown={setMouseDown}
        />
      )}
    </>
  )
}
