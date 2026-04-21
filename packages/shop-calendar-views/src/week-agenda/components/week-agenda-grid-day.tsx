import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import { useState, useContext } from 'preact/hooks'
import AgendaEvent from './agenda-event'
import { AppContext } from '@schedule-x/calendar/src/utils/stateful/app-context'

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
  const $app = useContext(AppContext)
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

  const handleOnContextMenu = (e: MouseEvent) => {
    const callback = $app.config.callbacks.onContextMenuWeekAgendaDate
    if (!callback || mouseDownOnChild) return

    const plainDate = Temporal.PlainDate.from({
      year: date.year,
      month: date.month,
      day: date.day,
    })
    callback(plainDate, e)
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
      onContextMenu={handleOnContextMenu}
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
          date={date}
        />
      ))}
    </div>
  )
}
