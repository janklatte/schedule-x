import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import {
  addTimePointsToDateTime,
  timePointsFromString,
} from '@schedule-x/shared/src/utils/stateless/time/time-points/string-conversion'
import { timeFromDateTime } from '@schedule-x/shared/src/utils/stateless/time/format-conversion/string-to-string'
import { updateEventsList } from './utils/stateless/update-events-list'
import { getEventCoordinates } from '@schedule-x/shared/src/utils/stateless/dom/get-event-coordinates'
import { DateRange } from '@schedule-x/shared/src/types/date-range'

export class TimelineEventResizer {
  private readonly originalEnd: Temporal.ZonedDateTime
  private readonly innerEl!: HTMLElement
  private readonly totalTP!: number
  private readonly innerElWidth!: number
  private readonly weekStart!: Temporal.ZonedDateTime
  private readonly dayStartTP!: number
  private readonly dayEndTP!: number
  private readonly timePointsPerDay!: number
  private readonly originalEndTP!: number
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
    this.innerElWidth =
      this.innerEl?.offsetWidth || this.innerEl?.scrollWidth || 1

    const range = $app.calendarState.range.value as DateRange
    const daysInWeek =
      range.start.toPlainDate().until(range.end.toPlainDate()).days + 1
    this.weekStart = range.start
      .toPlainDate()
      .toZonedDateTime($app.config.timezone.value)
    this.dayStartTP = $app.config.dayBoundaries.value.start
    this.dayEndTP = $app.config.dayBoundaries.value.end
    this.timePointsPerDay = $app.config.timePointsPerDay
    this.totalTP = daysInWeek * this.timePointsPerDay

    // Pre-compute originalEnd position in timeline TP space
    const endDayDiff = this.originalEnd.dayOfWeek - this.weekStart.dayOfWeek
    const endDayOffset = endDayDiff < 0 ? endDayDiff + 7 : endDayDiff
    const endTpInDay =
      timePointsFromString(timeFromDateTime(this.originalEnd.toString())) -
      this.dayStartTP
    this.originalEndTP = endDayOffset * this.timePointsPerDay + endTpInDay

    calendarWrapper.classList.add('sx__is-resizing')
    this.setupEventListeners()
  }

  private getTimePointsPerPixelX(): number {
    return this.totalTP / this.innerElWidth
  }

  private setupEventListeners() {
    document.addEventListener('mousemove', this.handleMouseOrTouchMove)
    document.addEventListener('mouseup', this.handleMouseUpOrTouchEnd, {
      once: true,
    })
    document.addEventListener('touchmove', this.handleMouseOrTouchMove, {
      passive: false,
    })
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
    // Convert to timeline TP position, add delta, then convert back respecting
    // day boundaries (so going past 19:00 wraps to 08:00 of the next day)
    const newTotalTP = Math.max(0, this.originalEndTP + pointsToAdd)
    const newDayOffset = Math.floor(newTotalTP / this.timePointsPerDay)
    const remainder = newTotalTP % this.timePointsPerDay
    // When landing exactly on a boundary, snap to end of current day
    // rather than start of next day
    const finalDayOffset =
      remainder === 0 && newDayOffset > 0 ? newDayOffset - 1 : newDayOffset
    const finalTpInDay =
      remainder === 0 && newDayOffset > 0
        ? this.dayEndTP
        : remainder + this.dayStartTP
    const dayStart = this.weekStart
      .add({ days: finalDayOffset })
      .toPlainDate()
      .toZonedDateTime(this.$app.config.timezone.value)
    const newEnd = addTimePointsToDateTime(
      dayStart,
      finalTpInDay
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
    document.removeEventListener('mousemove', this.handleMouseOrTouchMove)
    document.removeEventListener('touchmove', this.handleMouseOrTouchMove)
  }
}
