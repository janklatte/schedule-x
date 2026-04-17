/* eslint-disable max-lines */
import 'temporal-polyfill/global'
import '@fontsource/open-sans'
import '@fontsource/open-sans/300.css'
import '@fontsource/open-sans/500-italic.css'
import '@fontsource/open-sans/700.css'
import '@fontsource/open-sans/700-italic.css'
import '@fontsource/roboto-condensed'
import { createCalendar } from '@schedule-x/calendar/src'
import '../../packages/theme-default/src/calendar.scss'
import '../app.css'
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop/src'
import { createScrollControllerPlugin } from '@schedule-x/scroll-controller/src'
import { createResizePlugin } from '../../packages/resize/src'
import {
  createEventRecurrencePlugin,
  createEventsServicePlugin,
} from '@schedule-x/event-recurrence/src'
import { createCalendarControlsPlugin } from '../../packages/calendar-controls/src'
import { createViewMonthGrid } from '@schedule-x/calendar/src/views/month-grid'
import { createViewWeek } from '@schedule-x/calendar/src/views/week'
import { createViewDay } from '@schedule-x/calendar/src/views/day'
import { createViewMonthAgenda } from '@schedule-x/calendar/src/views/month-agenda'
import { createViewList } from '@schedule-x/calendar/src/views/list'
import { mergeLocales } from '@schedule-x/translations/src/utils/merge-locales.ts'
import { translations } from '@schedule-x/translations/src'
import { IANATimezone } from '@schedule-x/shared/src/utils/stateless/time/tzdb.ts'
import '../../packages/timezone-select/src/timezone-select.scss'
import { createCurrentTimePlugin } from '../../packages/current-time/src'
import { translations as timezoneSelectTranslations } from '../../packages/timezone-select/src'
import { createDragToCreatePlugin } from '../../packages/drag-to-create/src'
import {
  createViewResourceWeek,
  createViewResourceDay,
  createViewResourceTimeline,
  createViewWeekAgenda,
} from '../../packages/shop-calendar-views/src'

const calendarElement = document.getElementById('calendar') as HTMLElement

const eventsServicePlugin = createEventsServicePlugin()
const calendarControlsPlugin = createCalendarControlsPlugin()
const scrollController = createScrollControllerPlugin({
  initialScroll: '01:00',
})
const dragToCreatePlugin = createDragToCreatePlugin({
  enabled: true,
  onEventCreate: (event) => {
    console.log('onEventCreate', event)
    eventsServicePlugin.add(event)
  },
})

const resources = new Map([
  ['asdf-1234', 'Jimmy Doe'],
  ['asdf-4321', 'Jane Smith'],
  ['fdsa-4321', 'Ralle Rostfrei'],
  ['fdsa-1234', 'Ingo Injektor'],
  ['fdsa-5678', 'John Doe'],
  ['fdsa-9012', 'Marlene Kübler'],
  ['fdsa-3456', 'Rainer Zufall'],
  ['fdsa-7890', 'Felix Fuchs'],
  ['fdsa-0123', 'Hans Müller'],
  ['fdsa-4567', 'Maria Schmidt'],
  ['fdsa-8901', 'Peter Wagner'],
  ['fdsa-2345', 'Laura Meier'],
  ['fdsa-6789', 'Thomas Neumann'],
  ['fdsa-1011', 'Anna Becker'],
  ['fdsa-3212', 'Michael Fischer'],
  ['fdsa-5313', 'Sandra Klein'],
  ['fdsa-7414', 'Oliver Müller'],
  ['fdsa-9636', 'Julia Becker'],
  ['fdsa-1597', 'Markus Schmidt'],
  ['fdsa-3579', 'Thomas Wagner'],
  ['fdsa-2468', 'Laura Meier'],
  ['fdsa-1357', 'Thomas Neumann'],
  ['fdsa-0246', 'Anna Becker'],
  ['fdsa-9876', 'Michael Fischer'],
])

const events = [
  {
    id: 1,
    title: 'On Min Boundary',
    start: Temporal.ZonedDateTime.from('2025-10-24T09:00[Europe/Berlin]'),
    end: Temporal.ZonedDateTime.from('2025-10-24T10:00[Europe/Berlin]'),
    resourceId: 'asdf-1234',
  },
  {
    id: 2,
    title: 'On Max Boundary',
    start: Temporal.ZonedDateTime.from('2025-10-21T14:00[Europe/Berlin]'),
    end: Temporal.ZonedDateTime.from('2025-10-21T15:30[Europe/Berlin]'),
    resourceId: 'asdf-4321',
  },
  /* ...seededEvents.map(event => ({
    ...event,
    start: dateStringRegex.test(event.start) ? Temporal.PlainDate.from(event.start) : Temporal.ZonedDateTime.from(event.start),
    end: dateStringRegex.test(event.end) ? Temporal.PlainDate.from(event.end) : Temporal.ZonedDateTime.from(event.end),
  })), */
  /*     {
    id: 1,
    title: 'weekly',
    start: Temporal.PlainDate.from('2025-08-08'),
    end: Temporal.PlainDate.from('2025-08-08'),
    rrule: 'FREQ=WEEKLY;COUNT=10;BYDAY=MO,TU,WE,TH,FR',
  } */
  /* {
      id: 123,
      title: 'monthly',
      start: Temporal.ZonedDateTime.from('2025-08-11T14:00+02:00[Europe/Berlin]'),
      end: Temporal.ZonedDateTime.from('2025-08-12T15:00+02:00[Europe/Berlin]'),
    } */
]

// Generate 10 events for each resource for each day of the current week
let eventId = 9
const currentDate = Temporal.Now.plainDateISO()
const firstDayOfWeek = 1 // Monday

// Calculate the start of the current week
const dayOfWeek = currentDate.dayOfWeek
const daysToSubtract = (dayOfWeek - firstDayOfWeek + 7) % 7
const weekStart = currentDate.subtract({ days: daysToSubtract })

// Generate events for each resource
Array.from(resources.keys()).forEach((resourceId) => {
  if (resourceId !== 'asdf-1234') return
  // For each day of the week (7 days)
  Array.from({ length: 7 }).forEach((_, dayIndex) => {
    // Only create events on Mondays (0), Wednesdays (2), and Fridays (4)
    if (dayIndex !== 0 && dayIndex !== 2 && dayIndex !== 4) {
      return
    }

    const currentDay = weekStart.add({ days: dayIndex })
    const nextDay = currentDay.add({ days: 1 })

    // Create 1 event for this resource on this day
    Array.from({ length: 1 }).forEach((_, eventIndex) => {
      const startHour = 8 + eventIndex // Starting from 8:00
      const endHour = 10 // End at 10:00 on the next day

      events.push({
        id: eventId++,
        title: `Event ${eventId - 1}`,
        start: Temporal.ZonedDateTime.from(
          `${currentDay}T${String(startHour).padStart(2, '0')}:00[Europe/Berlin]`
        ),
        end: Temporal.ZonedDateTime.from(
          `${nextDay}T${String(endHour).padStart(2, '0')}:00[Europe/Berlin]`
        ),
        resourceId: resourceId,
      })
    })
  })
})

const calendar = createCalendar({
  plugins: [
    createEventRecurrencePlugin(),
    eventsServicePlugin,
    createDragAndDropPlugin(),
    createResizePlugin(),
    calendarControlsPlugin,
    // scrollController,
    createCurrentTimePlugin(),
    dragToCreatePlugin,
  ],

  translations: mergeLocales(translations, timezoneSelectTranslations),

  showWeekNumbers: true,
  /* dayBoundaries: {
    start: '20:00',
    end: '06:00'
  }, */
  firstDayOfWeek: 1,
  views: [
    createViewMonthGrid(),
    createViewWeek(),
    createViewDay(),
    createViewMonthAgenda(),
    createViewList(),
    createViewResourceWeek(),
    createViewResourceDay(),
    createViewWeekAgenda(),
    createViewResourceTimeline(),
  ],
  defaultView: 'resource-timeline',
  callbacks: {
    onScrollDayIntoView(date) {
      console.log('onScrollDayIntoView: ', date)
    },

    onEventUpdate(event) {
      console.log('onEventUpdate', event)
      console.log('event.start', event.start.toString())
      console.log('event.end', event.end.toString())
      console.log('event.resourceId', event.resourceId)
    },

    onEventClick(event, e) {
      console.log('onEventClick', event, e)
    },

    onDoubleClickEvent(event, e) {
      console.log('onDoubleClickEvent', event, e)
    },

    onClickDate(date) {
      console.log('onClickDate', date)
    },

    onClickDateTime(dateTime) {
      console.log('onClickDateTime', dateTime.toString())
    },

    onClickAgendaDate(date) {
      console.log('onClickAgendaDate', date.toString())
    },

    onDoubleClickAgendaDate(date) {
      console.log('onDoubleClickAgendaDate', date.toString())
    },

    onClickPlusEvents(date) {
      console.log('onClickPlusEvents', date.toString())
    },

    onSelectedDateUpdate(date) {
      console.log('onSelectedDateUpdate', date.toString())
    },

    onDoubleClickDateTime(dateTime) {
      console.log('onDoubleClickDateTime', dateTime.toString())
    },

    onDoubleClickDate(date) {
      console.log('onDoubleClickDate', date.toString())
    },

    onRangeUpdate(range) {
      console.log('onRangeUpdate', range.start.toString(), range.end.toString())
      /* console.log(range.start.toString())
      console.log(range.end.toString()) */
    },

    onWeekAgendaDayClick(event) {
      console.log('onWeekAgendaDayClick', event)
    },

    onEventContextMenu(event, e) {
      console.log('onEventContextMenu', event, e)
    },

    onContextMenuDateTime(event, e) {
      console.log('onContextMenuDateTime', event, e)
    },

    onContextMenuWeekAgendaDate(date, e) {
      console.log('onContextMenuWeekAgendaDate', date, e)
    },
  },
  // selectedDate: Temporal.PlainDate.from({ year: 2024, month: 2, day: 5 }),
  calendars: {
    personal: {
      colorName: 'personal',
      lightColors: {
        main: '#f9d71c',
        container: '#fff5aa',
        onContainer: '#594800',
      },
      darkColors: {
        main: '#fff5c0',
        onContainer: '#fff5de',
        container: '#a29742',
      },
    },
    work: {
      colorName: 'work',
      lightColors: {
        main: '#f91c45',
        container: '#ffd2dc',
        onContainer: '#59000d',
      },
      darkColors: {
        main: '#ffc0cc',
        onContainer: '#ffdee6',
        container: '#a24258',
      },
    },
    leisure: {
      colorName: 'leisure',
      lightColors: {
        main: '#1cf9b0',
        container: '#dafff0',
        onContainer: '#004d3d',
      },
      darkColors: {
        main: '#c0fff5',
        onContainer: '#e6fff5',
        container: '#42a297',
      },
    },
    school: {
      colorName: 'school',
      lightColors: {
        main: '#1c7df9',
        container: '#d2e7ff',
        onContainer: '#002859',
      },
      darkColors: {
        main: '#c0dfff',
        onContainer: '#dee6ff',
        container: '#426aa2',
      },
    },
  },
  minDate: Temporal.PlainDate.from('2026-03-13'),
  maxDate: Temporal.PlainDate.from('2026-12-31'),
  dayBoundaries: {
    start: '08:00',
    end: '19:00',
  },
  weekOptions: {
    gridStep: 60,
    gridHeight: 600,
    eventWidth: 95,
  },
  backgroundEvents: [],
  locale: 'de-DE',

  // tz new york
  timezone: 'Europe/Berlin',
  resources: resources,
  events: events,
})

// Set custom event component for time grid events (also used by agenda view)
calendar._setCustomComponentFn('timeGridEvent', (element, props) => {
  if (!element) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = props.calendarEvent as any

  // Create custom styled event
  element.innerHTML = `
    <div style="
      padding: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      height: 100%;
      border-left: 4px solid #ff6b6b;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      font-family: 'Open Sans', sans-serif;
    ">
      <div style="font-weight: bold; margin-bottom: 4px; font-size: 13px;">
        🎨 ${event.title}
      </div>
      <div style="font-size: 11px; opacity: 0.9;">
        ${event.start.toLocaleString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
        })} - ${event.end.toLocaleString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
        })}
      </div>
      ${
        event.people && event.people.length > 0
          ? `<div style="font-size: 10px; margin-top: 4px; opacity: 0.85;">
              👥 ${event.people.join(', ')}
            </div>`
          : ''
      }
    </div>
  `
})

// // Set custom event component for resource timeline events
// calendar._setCustomComponentFn('resourceTimelineEvent', (element, props) => {
//   if (!element) return

//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const event = props.calendarEvent as any

//   // Create custom styled timeline event
//   element.innerHTML = `
//     <div style="
//       padding: 4px 8px;
//       background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
//       color: white;
//       height: 100%;
//       width: 100%;
//       border-left: 4px solid #ff6b6b;
//       border-radius: 4px;
//       box-shadow: 0 2px 4px rgba(0,0,0,0.15);
//       font-family: 'Open Sans', sans-serif;
//       display: flex;
//       flex-direction: row;
//       justify-content: center;
//     ">
//       <div style="font-weight: 600; font-size: 12px; margin-bottom: 2px;">
//         📅 ${event.title}
//       </div>
//       <div style="font-size: 10px; opacity: 0.9;">
//         ${event.start.toLocaleString('en-US', {
//           hour: 'numeric',
//           minute: 'numeric',
//         })} - ${event.end.toLocaleString('en-US', {
//           hour: 'numeric',
//           minute: 'numeric',
//         })}
//       </div>
//     </div>
//   `
// })

calendar.render(calendarElement)

eventsServicePlugin.setBackgroundEvents([
  {
    title: 'Out of office',
    start: Temporal.ZonedDateTime.from('2026-04-16T00:00:00[Europe/Berlin]'),
    end: Temporal.ZonedDateTime.from('2026-04-16T12:00:00[Europe/Berlin]'),
    style: {
      // create tilted 5px thick gray lines
      backgroundImage:
        'repeating-linear-gradient(45deg, #ccc, #ccc 5px, transparent 5px, transparent 10px)',
      opacity: 0.5,
    },
    resourceId: 'asdf-1234',
    // rrule: 'FREQ=WEEKLY',
    // exdate: ['20250714T000000', '20250728T000000']
  },
  {
    title: 'Out of office',
    start: Temporal.ZonedDateTime.from('2025-11-18T00:00:00[Europe/Berlin]'),
    end: Temporal.ZonedDateTime.from('2025-11-18T14:00:00[Europe/Berlin]'),
    style: {
      // create tilted 5px thick gray lines
      backgroundImage:
        'repeating-linear-gradient(45deg, #ccc, #ccc 5px, transparent 5px, transparent 10px)',
      opacity: 0.5,
    },
    resourceId: 'asdf-4321',
    // rrule: 'FREQ=WEEKLY',
    // exdate: ['20250714T000000', '20250728T000000']
  },
])
// change timezone via calendarControlsPlugin
const timezoneSelect = document.getElementById(
  'timezone-select'
) as HTMLSelectElement
timezoneSelect.addEventListener('change', (e) => {
  const newTimezone = (e.target as HTMLSelectElement).value
  if (newTimezone) {
    calendarControlsPlugin.setTimezone(newTimezone as IANATimezone)
  }
})

const doStuffButton = document.getElementById('do-stuff') as HTMLButtonElement
doStuffButton.addEventListener('click', () => {
  scrollController.scrollTo('09:00')
})

// Drag-to-create plugin controls
console.log('🎨 Drag-to-Create Plugin loaded!')
console.log('Click and drag on empty calendar space to create events')
console.log('Control the plugin programmatically:')
console.log('  calendar.dragToCreate.setEnabled(false) - disable the plugin')
console.log(
  '  calendar.dragToCreate.setSnapInterval(30) - change snap interval'
)

// Example: expose to window for easy testing in console
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).calendar = calendar
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).dragToCreate = dragToCreatePlugin
