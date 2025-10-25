import { createPreactView } from '@schedule-x/calendar/src/utils/stateful/preact-view/preact-view'
import { addDays } from '@schedule-x/shared/src/utils/stateless/time/date-time-mutation/adding'
import { ResourceWeekWrapper } from './components/resource-week-view'
import { setRangeForWeek } from '@schedule-x/calendar/src/utils/stateless/time/range/set-range'

type PreactView = ReturnType<typeof createPreactView>

type ViewFactory = () => PreactView

export type PreactViewComponent = ReturnType<
  typeof createPreactView
>['Component']

export const createViewResourceWeek: ViewFactory = () =>
  createPreactView({
    name: 'resource-week',
    label: 'ResourceWeek',
    Component: ResourceWeekWrapper,
    hasWideScreenCompat: true,
    hasSmallScreenCompat: false,
    backwardForwardFn: addDays,
    backwardForwardUnits: 7,
    setDateRange: setRangeForWeek,
  })
