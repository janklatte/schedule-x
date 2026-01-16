import CalendarAppSingleton from '@schedule-x/shared/src/interfaces/calendar/calendar-app-singleton'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'

export const invokeOnEventContextMenuCallback = (
  $app: CalendarAppSingleton,
  calendarEvent: CalendarEventInternal,
  e: UIEvent
) => {
  if ($app.config.callbacks.onEventContextMenu) {
    $app.config.callbacks.onEventContextMenu(
      calendarEvent._getExternalEvent(),
      e
    )
  }
}
