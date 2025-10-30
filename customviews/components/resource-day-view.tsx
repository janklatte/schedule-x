import { PreactViewComponent } from '@schedule-x/shared/src/types/calendar/preact-view-component'
import { ResourceWeekWrapper } from './resource-week-view'

export const ResourceDayWrapper: PreactViewComponent = ({ $app, id }) => {
  return <ResourceWeekWrapper $app={$app} id={id} />
}
