import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import { useState } from 'preact/hooks'
import AgendaEvent from './agenda-event'

type props = {
  calendarEvents: CalendarEventInternal[]
  date: Temporal.ZonedDateTime
  onClick: ((date: Temporal.ZonedDateTime) => void) | undefined
}

export default function WeekAgendaGridDay({
  calendarEvents,
  date,
  onClick,
}: props) {
  const [mouseDownOnChild, setMouseDownOnChild] = useState<boolean>(false)

  const handleOnClick = () => {
    if (!onClick || mouseDownOnChild) return
    onClick(date)
  }

  const handlePointerUp = () => {
    const msWaitToEnsureThatClickEventWasDispatched = 10
    setTimeout(() => {
      setMouseDownOnChild(false)
    }, msWaitToEnsureThatClickEventWasDispatched)
  }

  return (
    <div
      className="sx__week-agenda-day"
      style={{
        position: 'relative',
        width: '100%',
        borderLeft: 'var(--sx-border)',
        padding: '12px 8px',
      }}
      onClick={handleOnClick}
      onMouseLeave={() => setMouseDownOnChild(false)}
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
    >
      {calendarEvents.map((event) => (
        <AgendaEvent
          key={event.id}
          isCopy={false}
          calendarEvent={event}
          setMouseDown={setMouseDownOnChild}
        />
      ))}
    </div>
  )
}
