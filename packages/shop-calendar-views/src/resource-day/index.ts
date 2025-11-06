import { createPreactView } from '@schedule-x/calendar/src/utils/stateful/preact-view/preact-view'
import { InternalViewName } from '@schedule-x/shared/src/enums/calendar/internal-view.enum'
import { ResourceDayWrapper } from './components/resource-day-wrapper'
import { setRangeForDay } from '@schedule-x/calendar/src/utils/stateless/time/range/set-range'
import { addDays } from '@schedule-x/shared/src/utils/stateless/time/date-time-mutation/adding'

const config = {
  name: InternalViewName.ResourceDay,
  label: 'ResourceDay',
  Component: ResourceDayWrapper,
  hasWideScreenCompat: true,
  hasSmallScreenCompat: true,
  backwardForwardFn: addDays,
  backwardForwardUnits: 1,
  setDateRange: setRangeForDay,
}

export const viewResourceDay = createPreactView(config)
export const createViewResourceDay = () => createPreactView(config)
