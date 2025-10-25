import { WeekDay } from '@schedule-x/calendar/src/types/week'
import { getClassNameForWeekday } from '@schedule-x/calendar/src/utils/stateless/get-class-name-for-weekday'
import { isToday } from '@schedule-x/shared/src/utils/stateless/time/comparison'
import { toDateString } from '@schedule-x/shared/src'
import { getDayNameShort } from '@schedule-x/shared/src/utils/stateless/time/date-time-localization/date-time-localization'
import CalendarConfigInternal from '@schedule-x/shared/src/interfaces/calendar/calendar-config'

type props = {
  appConfig: CalendarConfigInternal
  day: WeekDay
  people: string[]
  date: Temporal.ZonedDateTime
  idx: number
  minResourceColumnWidth: number
}

export default function ResourceWeekDayHeader({
  appConfig,
  day,
  people,
  date,
  idx,
  minResourceColumnWidth,
}: props) {
  const getClassNames = (date: Temporal.ZonedDateTime) => {
    const classNames = [
      'sx__week-grid__date',
      getClassNameForWeekday(date.dayOfWeek),
    ]
    if (isToday(date, appConfig.timezone.value)) {
      classNames.push('sx__week-grid__date--is-today')
    }
    return classNames.join(' ')
  }

  return (
    <div
      className="sx__resource-week-day-group"
      key={day.date}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: `${minResourceColumnWidth * (people.length || 1)}px`,
        flex: 1,
      }}
    >
      {/* Day header - merged across all resource columns */}
      <div
        className={getClassNames(date)}
        data-date={toDateString(date)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderBottom: 'var(--sx-border)',
          padding: '8px 0',
          borderLeft:
            idx > 0 ? '1px dashed var(--sx-color-outline-variant)' : 'none',
          borderImage:
            'linear-gradient(to top, var(--sx-color-outline-variant), rgba(0, 0, 0, 0)) 1 100%',
        }}
        data-index={idx}
      >
        <div className="sx__week-grid__day-name">
          {getDayNameShort(date, appConfig.locale.value)}
        </div>
        <div className="sx__week-grid__date-number">{date.day}</div>
      </div>

      {/* Resource names row below the day */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${people.length || 1}, 1fr)`,
          width: '100%',
        }}
      >
        {people.length > 0 ? (
          people.map((person, personIdx) => (
            <div
              key={`${day.date}-${person}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 4px',
                fontSize: 'var(--sx-font-small)',
                fontWeight: 600,
                color: 'var(--sx-color-neutral)',
                borderLeft: '1px solid var(--sx-color-outline-variant)',
                borderImage:
                  (personIdx == 0 && idx == 0) || personIdx != 0
                    ? 'linear-gradient(to top, var(--sx-color-outline-variant), rgba(0, 0, 0, 0)) 1 100%'
                    : 'none',
              }}
            >
              {person}
            </div>
          ))
        ) : (
          <div
            style={{
              padding: '8px 4px',
              textAlign: 'center',
            }}
          >
            {/* Empty placeholder when no people */}
          </div>
        )}
      </div>
    </div>
  )
}
