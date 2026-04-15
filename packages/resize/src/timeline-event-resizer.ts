import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import { addTimePointsToDateTime } from '@schedule-x/shared/src/utils/stateless/time/time-points/string-conversion'
import { updateEventsList } from './utils/stateless/update-events-list'
import { getEventCoordinates } from '@schedule-x/shared/src/utils/stateless/dom/get-event-coordinates'
import { DateRange } from '@schedule-x/shared/src/types/date-range'

export class TimelineEventResizer {
  private readonly originalEnd: Temporal.ZonedDateTime
  private readonly innerEl!: HTMLElement
  private readonly totalTP!: number
  private lastValidEnd: Temporal.ZonedDateTime
  private lastIntervalDiff = 0

  constructor(
    private $app: CalendarAppSingleton,
    private eventCopy: CalendarEventInternal,
    private updateCopy: (newCopy: CalendarEventInternal | undefined) => void,
    private initialX: number,
    private readonly CHANGE_THRESHOLD_IN_TIME_POINTS: number
  ) {
    this.originalEnd = eventCopy.end as Temporal.ZonedDateTime
    this.lastValidEnd = eventCopy.end as Temporal.ZonedDateTime

    const calendarWrapper = $app.elements.calendarWrapper as HTMLElement
    if (!calendarWrapper) return

    const gridScrollable = calendarWrapper.querySelector(
      '.sx__resource-timeline-grid-scrollable'
    ) as HTMLElement
    const scrollEl = gridScrollable?.children[1] as HTMLElement
    this.innerEl = scrollEl?.firstElementChild as HTMLElement

    const range = $app.calendarState.range.value as DateRange
    const daysInWeek =
      range.start.toPlainDate().until(range.end.toPlainDate()).days + 1
    this.totalTP = daysInWeek * $app.config.timePointsPerDay

    calendarWrapper.classList.add('sx__is-resizing')
    this.setupEventListeners()
  }

  private getTimePointsPerPixelX(): number {
    if (!this.innerEl) return 1
    return this.totalTP / this.innerEl.scrollWidth
  }

  private setupEventListeners() {
    ;(this.$app.elements.calendarWrapper as HTMLElement).addEventListener(
      'mousemove',
      this.handleMouseOrTouchMove
    )
    document.addEventListener('mouseup', this.handleMouseUpOrTouchEnd, {
      once: true,
    })
    ;(this.$app.elements.calendarWrapper as HTMLElement).addEventListener(
      'touchmove',
      this.handleMouseOrTouchMove,
      { passive: false }
    )
    document.addEventListener('touchend', this.handleMouseUpOrTouchEnd, {
      once: true,
    })
  }

  private handleMouseOrTouchMove = (event: UIEvent) => {
    const { clientX } = getEventCoordinates(event)
    const pixelDiffX = clientX - this.initialX
    const timePointsDiffX = pixelDiffX * this.getTimePointsPerPixelX()
    const currentIntervalDiff = Math.round(
      timePointsDiffX / this.CHANGE_THRESHOLD_IN_TIME_POINTS
    )

    if (currentIntervalDiff === this.lastIntervalDiff) return
    this.lastIntervalDiff = currentIntervalDiff

    this.setNewEnd(this.CHANGE_THRESHOLD_IN_TIME_POINTS * currentIntervalDiff)
  }

  private setNewEnd(pointsToAdd: number) {
    const newEnd = addTimePointsToDateTime(
      this.originalEnd,
      pointsToAdd
    ) as Temporal.ZonedDateTime

    if (
      newEnd.epochNanoseconds <=
      (this.eventCopy.start as Temporal.ZonedDateTime).epochNanoseconds
    )
      return

    const range = this.$app.calendarState.range.value as DateRange
    if (newEnd.epochNanoseconds > range.end.epochNanoseconds) return

    this.lastValidEnd = newEnd
    this.eventCopy.end = newEnd
    this.updateCopy(this.eventCopy)
  }

  private handleMouseUpOrTouchEnd = async () => {
    const onBeforeEventUpdate =
      this.$app.config.callbacks.onBeforeEventUpdateAsync ||
      this.$app.config.callbacks.onBeforeEventUpdate
    if (onBeforeEventUpdate) {
      const oldEvent = this.eventCopy._getExternalEvent()
      oldEvent.end = this.originalEnd
      const newEvent = this.eventCopy._getExternalEvent()
      const validationResult = await onBeforeEventUpdate(
        oldEvent,
        newEvent,
        this.$app
      )

      if (!validationResult) {
        this.eventCopy.end = this.originalEnd
        this.finish()
        return
      }
    }

    this.setNewEnd(this.CHANGE_THRESHOLD_IN_TIME_POINTS * this.lastIntervalDiff)
    updateEventsList(
      this.$app,
      this.eventCopy,
      this.originalEnd,
      this.lastValidEnd
    )
    this.finish()

    if (this.$app.config.callbacks.onEventUpdate) {
      this.$app.config.callbacks.onEventUpdate(
        this.eventCopy._getExternalEvent()
      )
    }
  }

  private finish() {
    this.updateCopy(undefined)
    const calendarWrapper = this.$app.elements.calendarWrapper as HTMLElement
    calendarWrapper.classList.remove('sx__is-resizing')
    calendarWrapper.removeEventListener(
      'mousemove',
      this.handleMouseOrTouchMove
    )
    calendarWrapper.removeEventListener(
      'touchmove',
      this.handleMouseOrTouchMove
    )
  }
}
