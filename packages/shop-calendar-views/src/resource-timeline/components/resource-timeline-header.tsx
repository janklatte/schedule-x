import { WeekDay } from '@schedule-x/calendar/src/types/week'
import { getClassNameForWeekday } from '@schedule-x/calendar/src/utils/stateless/get-class-name-for-weekday'
import { isToday } from '@schedule-x/shared/src/utils/stateless/time/comparison'
import { toDateString } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/date-to-strings'
import { getDayNameShort } from '@schedule-x/shared/src/utils/stateless/time/date-time-localization/date-time-localization'
import CalendarConfigInternal from '@schedule-x/shared/src/interfaces/calendar/calendar-config'

type props = {
  appConfig: CalendarConfigInternal
  day: WeekDay
  date: Temporal.ZonedDateTime
  idx: number
  minTimeColumnWidth: number
  gridSteps: Array<{ hour: number; minute: number }>
}

export default function ResourceTimelineHeader({
  appConfig,
  day,
  date,
  idx,
  minTimeColumnWidth,
  gridSteps,
}: props) {
  const formatter = new Intl.DateTimeFormat(
    appConfig.locale.value,
    appConfig.weekOptions.value.timeAxisFormatOptions
  )

  const getClassNames = (date: Temporal.ZonedDateTime) => {
    const classNames = [
      'sx__resource-timeline-day-header',
      getClassNameForWeekday(date.dayOfWeek),
    ]
    if (isToday(date, appConfig.timezone.value)) {
      classNames.push('sx__week-grid__date--is-today')
    }
    return classNames.join(' ')
  }

  const getColumnWidth = () => {
    return `${minTimeColumnWidth * gridSteps.length}px`
  }

  return (
    <div
      className={getClassNames(date)}
      data-date={toDateString(date)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: getColumnWidth(),
      }}
      data-index={idx}
    >
      {idx > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '2px',
            transform: 'translateX(-100%)',
            background:
              'linear-gradient(to top, var(--sx-color-outline-variant), rgba(0, 0, 0, 0) 80%)',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* Day header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '8px 4px',
        }}
      >
        <div className="sx__week-grid__day-name">
          {getDayNameShort(date, appConfig.locale.value)}
        </div>
        <div className="sx__week-grid__date-number">{date.day}</div>
      </div>

      {/* Time slots as columns */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {gridSteps.map((gridStep, index) => (
          <div
            key={`${day.date}-${gridStep.hour}-${gridStep.minute}`}
            className="sx__resource-timeline-time-slot"
            style={{
              //   minWidth: `${minTimeColumnWidth}px`,
              width: `${minTimeColumnWidth}px`,
              borderLeft:
                index > 0
                  ? '1px solid var(--sx-color-outline-variant)'
                  : 'none',
              padding: '4px 2px',
              fontSize: 'var(--sx-font-small)',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              className="sx__timeline-grid__hour-text"
              style={{ display: 'flex' }}
            >
              {formatter.format(
                new Date(0, 0, 0, gridStep.hour, gridStep.minute)
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
