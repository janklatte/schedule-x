import CalendarEventExternal from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import PluginBase from '@schedule-x/shared/src/interfaces/plugin.interface'

/**
 * Plugin interface for drag-to-create functionality
 * Allows users to create events by clicking and dragging on the calendar
 */
export default interface DragToCreatePlugin extends PluginBase<string> {
  getOnEventCreateCallback(): (event: CalendarEventExternal) => void
  /**
   * Enable or disable the drag-to-create functionality
   */
  setEnabled(enabled: boolean): void

  /**
   * Check if drag-to-create is currently enabled
   */
  isEnabled(): boolean
}
