import DragToCreatePlugin from './drag-to-create-plugin.interface'
import CalendarAppSingleton from '@schedule-x/shared/src/interfaces/calendar/calendar-app-singleton'
import { definePlugin } from '@schedule-x/shared/src/utils/stateless/calendar/define-plugin'
import DragToCreateHandler from './drag-to-create-handler'
import CalendarEventExternal from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'

/**
 * Implementation of the drag-to-create plugin
 * This plugin allows users to create calendar events by:
 * 1. Mouse down on an empty calendar slot
 * 2. Drag to select a time range
 * 3. Mouse up to create the event
 */
class DragToCreatePluginImpl implements DragToCreatePlugin {
  name = 'dragToCreate'
  private enabled = true
  private handler: DragToCreateHandler | null = null
  private onEventCreate: (event: CalendarEventExternal) => void

  constructor(config?: {
    enabled?: boolean
    onEventCreate?: (event: CalendarEventExternal) => void
  }) {
    this.enabled = config?.enabled ?? true
    this.onEventCreate = config?.onEventCreate ?? (() => {})
  }

  /**
   * Called before the calendar renders
   * This is where we can set up any initial state
   */
  beforeRender($app: CalendarAppSingleton): void {
    // Store reference to $app for later use
    this.handler = new DragToCreateHandler($app, this)
  }

  /**
   * Called when the calendar renders
   * This is where we attach event listeners and modify the DOM
   */
  onRender($app: CalendarAppSingleton): void {
    if (!$app.elements.calendarWrapper) return

    // Initialize the drag handler
    if (this.handler) {
      this.handler.initialize()
    }
  }

  /**
   * Called when the plugin is destroyed
   * Clean up event listeners and resources
   */
  destroy(): void {
    if (this.handler) {
      this.handler.cleanup()
      this.handler = null
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (this.handler) {
      this.handler.setEnabled(enabled)
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  getOnEventCreateCallback(): (event: CalendarEventExternal) => void {
    return this.onEventCreate
  }
}

/**
 * Factory function to create the drag-to-create plugin
 * @param config - Optional configuration
 * @returns Configured plugin instance
 */
export const createDragToCreatePlugin = (config?: {
  enabled?: boolean
  onEventCreate?: (event: CalendarEventExternal) => void
}) => {
  return definePlugin(
    'dragToCreate',
    new DragToCreatePluginImpl(config)
  ) as DragToCreatePluginImpl & { name: 'dragToCreate' }
}
