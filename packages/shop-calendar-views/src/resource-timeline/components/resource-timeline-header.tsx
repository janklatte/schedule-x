import { WeekDay } from '@schedule-x/calendar/src/types/week'
import { getClassNameForWeekday } from '@schedule-x/calendar/src/utils/stateless/get-class-name-for-weekday'
import { isToday } from '@schedule-x/shared/src/utils/stateless/time/comparison'
import { toDateString } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/date-to-strings'
import { getDayNameShort } from '@schedule-x/shared/src/utils/stateless/time/date-time-localization/date-time-localization'
import CalendarConfigInternal from '@schedule-x/shared/src/interfaces/calendar/calendar-config'
import { getTimeAxisHours } from '@schedule-x/calendar/src/utils/stateless/time/time-axis/time-axis'
import { useSignalEffect } from '@preact/signals'
import { useState } from 'preact/hooks'

type props = {
  appConfig: CalendarConfigInternal
  day: WeekDay
  date: Temporal.ZonedDateTime
  idx: number
  minTimeColumnWidth: number
}

export default function ResourceTimelineHeader({
  appConfig,
  day,
  date,
  idx,
  minTimeColumnWidth,
}: props) {
  const [gridSteps, setGridSteps] = useState<
    { hour: number; minute: number }[]
  >([])

  useSignalEffect(() => {
    const hourSteps = getTimeAxisHours(
      appConfig.dayBoundaries.value,
      appConfig.isHybridDay
    )

    const result: { hour: number; minute: number }[] = []

    hourSteps.forEach((hour) => {
      if (appConfig.weekOptions.value.gridStep === 60) {
        result.push({ hour: hour, minute: 0 })
      }
      if (appConfig.weekOptions.value.gridStep === 30) {
        result.push({ hour: hour, minute: 0 }, { hour: hour, minute: 30 })
      }
      if (appConfig.weekOptions.value.gridStep === 15) {
        result.push(
          { hour: hour, minute: 0 },
          { hour: hour, minute: 15 },
          { hour: hour, minute: 30 },
          { hour: hour, minute: 45 }
        )
      }
    })

    setGridSteps(result)
  })

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

  return (
    <div
      className={getClassNames(date)}
      data-date={toDateString(date)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: `${minTimeColumnWidth * gridSteps.length}px`,
        borderRight:
          idx < 6 ? `1px dashed var(--sx-color-outline-variant)` : 'none',
      }}
      data-index={idx}
    >
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
                  ? '1px dashed var(--sx-color-outline-variant)'
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
