import { createPreactView } from '@schedule-x/calendar/src/utils/stateful/preact-view/preact-view'
import { InternalViewName } from '@schedule-x/shared/src/enums/calendar/internal-view.enum'
import { ResourceTimelineWrapper } from './components/resource-timeline-wrapper'
import { setRangeForWeek } from '@schedule-x/calendar/src/utils/stateless/time/range/set-range'
import { addDays } from '@schedule-x/shared/src/utils/stateless/time/date-time-mutation/adding'

const config = {
  name: InternalViewName.ResourceTimeline,
  label: 'ResourceTimeline',
  Component: ResourceTimelineWrapper,
  hasWideScreenCompat: true,
  hasSmallScreenCompat: false,
  backwardForwardFn: addDays,
  backwardForwardUnits: 7,
  setDateRange: setRangeForWeek,
}

export const viewResourceTimeline = createPreactView(config)
export const createViewResourceTimeline = () => createPreactView(config)
