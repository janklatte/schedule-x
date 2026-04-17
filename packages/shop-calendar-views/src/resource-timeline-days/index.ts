import { createPreactView } from '@schedule-x/calendar/src/utils/stateful/preact-view/preact-view'
import { InternalViewName } from '@schedule-x/shared/src/enums/calendar/internal-view.enum'
import { ResourceTimelineDaysWrapper } from './components/resource-timeline-days-wrapper'
import { setRangeForWeek } from '@schedule-x/calendar/src/utils/stateless/time/range/set-range'
import { addDays } from '@schedule-x/shared/src/utils/stateless/time/date-time-mutation/adding'

const config = {
  name: InternalViewName.ResourceTimelineDays,
  label: 'Zeitleiste (Tage)',
  Component: ResourceTimelineDaysWrapper,
  hasWideScreenCompat: true,
  hasSmallScreenCompat: false,
  backwardForwardFn: addDays,
  backwardForwardUnits: 7,
  setDateRange: setRangeForWeek,
}

export const viewResourceTimelineDays = createPreactView(config)
export const createViewResourceTimelineDays = () => createPreactView(config)
