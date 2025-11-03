import { createPreactView } from '@schedule-x/calendar/src/utils/stateful/preact-view/preact-view'
import { addDays } from '@schedule-x/shared/src/utils/stateless/time/date-time-mutation/adding'
import { ResourceWeekWrapper } from './components/resource-week-view'
import { ResourceDayWrapper } from './components/resource-day-view'
import { WeekAgendaWrapper } from './components/week-agenda-view'
import {
  setRangeForWeek,
  setRangeForDay,
} from '@schedule-x/calendar/src/utils/stateless/time/range/set-range'
import { InternalViewName } from '@schedule-x/shared/src/enums/calendar/internal-view.enum'

type PreactView = ReturnType<typeof createPreactView>

type ViewFactory = () => PreactView

export type PreactViewComponent = ReturnType<
  typeof createPreactView
>['Component']

export const createViewResourceWeek: ViewFactory = () =>
  createPreactView({
    name: InternalViewName.ResourceWeek,
    label: 'ResourceWeek',
    Component: ResourceWeekWrapper,
    hasWideScreenCompat: true,
    hasSmallScreenCompat: false,
    backwardForwardFn: addDays,
    backwardForwardUnits: 7,
    setDateRange: setRangeForWeek,
  })

export const createViewResourceDay: ViewFactory = () =>
  createPreactView({
    name: InternalViewName.ResourceDay,
    label: 'ResourceDay',
    Component: ResourceDayWrapper,
    hasWideScreenCompat: true,
    hasSmallScreenCompat: true,
    backwardForwardFn: addDays,
    backwardForwardUnits: 1,
    setDateRange: setRangeForDay,
  })

export const createViewWeekAgenda: ViewFactory = () =>
  createPreactView({
    name: InternalViewName.WeekAgenda,
    label: 'WeekAgenda',
    Component: WeekAgendaWrapper,
    hasWideScreenCompat: true,
    hasSmallScreenCompat: false,
    backwardForwardFn: addDays,
    backwardForwardUnits: 7,
    setDateRange: setRangeForWeek,
  })
