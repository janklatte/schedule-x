import { WeekDay } from '@schedule-x/calendar/src/types/week'
import { getClassNameForWeekday } from '@schedule-x/calendar/src/utils/stateless/get-class-name-for-weekday'
import { isToday } from '@schedule-x/shared/src/utils/stateless/time/comparison'
import { toDateString } from '@schedule-x/shared/src'
import { getDayNameShort } from '@schedule-x/shared/src/utils/stateless/time/date-time-localization/date-time-localization'
import CalendarConfigInternal from '@schedule-x/shared/src/interfaces/calendar/calendar-config'
import { useSignal } from '@preact/signals'
import { useRef, useEffect } from 'preact/hooks'

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
  const resourceWeekDayGroupRef = useRef<HTMLDivElement>(null)

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

  const dateElementRef = useRef<HTMLDivElement>(null)
  const activateStickyDateElement = useSignal(false)

  useEffect(() => {
    const handleResize = () => {
      if (
        resourceWeekDayGroupRef.current &&
        window.innerWidth < resourceWeekDayGroupRef.current.clientWidth * 2.0
      ) {
        activateStickyDateElement.value = true
      } else {
        activateStickyDateElement.value = false
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      className="sx__resource-week-day-group"
      ref={resourceWeekDayGroupRef}
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
          flexDirection: 'row',
          borderBottom: 'var(--sx-border)',
          padding: `8px 5vw`,
          borderLeft:
            idx > 0 ? `3px dashed var(--sx-color-outline-variant)` : 'none',
          borderImage:
            'linear-gradient(to top, var(--sx-color-outline-variant), rgba(0, 0, 0, 0) 80%) 1 100%',
          justifyContent: activateStickyDateElement.value
            ? 'flex-start'
            : 'center',
        }}
        data-index={idx}
      >
        <div
          className="sx__week-grid__date-inner"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: activateStickyDateElement.value ? 'sticky' : 'relative',
            left: activateStickyDateElement.value ? '50%' : '0%',
          }}
          ref={dateElementRef}
        >
          <div className="sx__week-grid__day-name">
            {getDayNameShort(date, appConfig.locale.value)}
          </div>
          <div className="sx__week-grid__date-number">{date.day}</div>
        </div>
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
          people.map((person, personIdx) => {
            return (
              <div
                key={`${day.date}-${personIdx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 4px',
                  fontSize: 'var(--sx-font-small)',
                  fontWeight: 600,
                  color: 'var(--sx-color-neutral)',
                  borderLeft: `${personIdx == 0 ? 3 : 1}px solid var(--sx-color-outline-variant)`,
                  borderImage:
                    (personIdx == 0 && idx == 0) || personIdx != 0
                      ? 'linear-gradient(to top, var(--sx-color-outline-variant), rgba(0, 0, 0, 0)) 1 100%'
                      : 'none',
                }}
              >
                {person}
              </div>
            )
          })
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
