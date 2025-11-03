import CalendarAppSingleton from '@schedule-x/shared/src/interfaces/calendar/calendar-app-singleton'

export const getTimeGridDayWidth = ($app: CalendarAppSingleton) => {
  let dayElement = ($app.elements.calendarWrapper as HTMLElement).querySelector(
    '.sx__time-grid-day'
  ) as HTMLDivElement

  if (!dayElement) {
    dayElement = ($app.elements.calendarWrapper as HTMLElement).querySelector(
      '.sx__week-agenda-day'
    ) as HTMLDivElement
  }

  return dayElement.clientWidth
}
