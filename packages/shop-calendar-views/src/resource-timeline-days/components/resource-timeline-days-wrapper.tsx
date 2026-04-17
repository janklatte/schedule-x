import { PreactViewComponent } from '@schedule-x/shared/src/types/calendar/preact-view-component'
import { createResourceTimelineWrapper } from '../../resource-timeline/components/resource-timeline-wrapper'

const ResourceTimelineDaysWrapperInner = createResourceTimelineWrapper('day')

export const ResourceTimelineDaysWrapper: PreactViewComponent = ({
  $app,
  id,
}) => {
  return <ResourceTimelineDaysWrapperInner $app={$app} id={id} />
}
