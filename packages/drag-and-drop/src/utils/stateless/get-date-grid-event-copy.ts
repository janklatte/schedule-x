import { getTimeGridEventCopyElementId } from '@schedule-x/shared/src/utils/stateless/strings/selector-generators'
import CalendarAppSingleton from '@schedule-x/shared/src/interfaces/calendar/calendar-app-singleton'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'

export const getDateGridEventCopy = (
  $app: CalendarAppSingleton,
  eventCopy: CalendarEventInternal
) => {
  const copy = ($app.elements.calendarWrapper as HTMLElement).querySelector(
    '#' + getTimeGridEventCopyElementId(eventCopy.id)
  ) as HTMLDivElement
  return copy
}
