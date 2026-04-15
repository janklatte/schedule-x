import CalendarAppSingleton from '@schedule-x/shared/src/interfaces/calendar/calendar-app-singleton'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import { EventCoordinates } from '@schedule-x/shared/src/interfaces/shared/event-coordinates'
import { getEventCoordinates } from '@schedule-x/shared/src/utils/stateless/dom/get-event-coordinates'
import { addTimePointsToDateTime } from '@schedule-x/shared/src/utils/stateless/time/time-points/string-conversion'
import { DateRange } from '@schedule-x/shared/src/types/date-range'
import { testIfShouldAbort } from './utils/stateless/test-if-should-abort'
import { updateDraggedEvent } from './utils/stateless/update-dragged-event'
import TimelineDragHandler from '@schedule-x/shared/src/interfaces/drag-and-drop/timeline-drag-handler.interface'

const RESOURCE_ROW_HEIGHT = 50

export default class TimelineDragHandlerImpl implements TimelineDragHandler {
  private readonly scrollEl: HTMLElement
  private readonly innerEl: HTMLElement
  private readonly resourceIds: string[]
  private readonly originalStart: Temporal.ZonedDateTime
  private readonly originalEnd: Temporal.ZonedDateTime
  private readonly daysInWeek: number
  private readonly weekStart: Temporal.ZonedDateTime
  private readonly dayStartTP: number
  private readonly timePointsPerDay: number
  private readonly totalTP: number
  private lastClientX: number
  private lastClientY: number

  constructor(
    private $app: CalendarAppSingleton,
    private eventCoordinates: EventCoordinates,
    private eventCopy: CalendarEventInternal,
    private updateCopy: (newCopy: CalendarEventInternal | undefined) => void,
    private readonly CHANGE_THRESHOLD_IN_TIME_POINTS: number
  ) {
    const calendarWrapper = $app.elements.calendarWrapper as HTMLElement
    const gridScrollable = calendarWrapper.querySelector(
      '.sx__resource-timeline-grid-scrollable'
    ) as HTMLElement
    this.scrollEl = gridScrollable.children[1] as HTMLElement
    this.innerEl = this.scrollEl.firstElementChild as HTMLElement

    this.resourceIds = Array.from($app.config.resources.value).map(([id]) => id)

    this.originalStart = Temporal.ZonedDateTime.from(eventCopy.start.toString())
    this.originalEnd = Temporal.ZonedDateTime.from(eventCopy.end.toString())

    const range = $app.calendarState.range.value as DateRange
    this.daysInWeek =
      range.start.toPlainDate().until(range.end.toPlainDate()).days + 1
    this.weekStart = range.start
      .toPlainDate()
      .toZonedDateTime($app.config.timezone.value)
    this.dayStartTP = $app.config.dayBoundaries.value.start
    this.timePointsPerDay = $app.config.timePointsPerDay
    this.totalTP = this.daysInWeek * this.timePointsPerDay

    this.lastClientX = eventCoordinates.clientX
    this.lastClientY = eventCoordinates.clientY

    this.init()
  }

  private init() {
    document.addEventListener('mousemove', this.handleMouseOrTouchMove)
    document.addEventListener('mouseup', this.handleMouseUpOrTouchEnd)
    document.addEventListener('touchmove', this.handleMouseOrTouchMove, {
      passive: false,
    })
    document.addEventListener('touchend', this.handleMouseUpOrTouchEnd)
    this.scrollEl.addEventListener('scroll', this.handleScroll)
  }

  private getDateTimeFromClientX(
    clientX: number
  ): Temporal.ZonedDateTime | null {
    const scrollRect = this.scrollEl.getBoundingClientRect()
    const contentX = clientX - scrollRect.left + this.scrollEl.scrollLeft
    const fraction = Math.max(
      0,
      Math.min(1, contentX / this.innerEl.scrollWidth)
    )

    const intervalTP = this.CHANGE_THRESHOLD_IN_TIME_POINTS
    const rawTP = fraction * this.totalTP
    const snappedTP = Math.round(rawTP / intervalTP) * intervalTP
    const clampedTP = Math.max(
      0,
      Math.min(this.totalTP - intervalTP, snappedTP)
    )

    const dayOffset = Math.min(
      Math.floor(clampedTP / this.timePointsPerDay),
      this.daysInWeek - 1
    )
    const tpInDay = (clampedTP % this.timePointsPerDay) + this.dayStartTP

    const dayStart = this.weekStart
      .add({ days: dayOffset })
      .toPlainDate()
      .toZonedDateTime(this.$app.config.timezone.value)
    return addTimePointsToDateTime(dayStart, tpInDay)
  }

  private getResourceFromClientY(clientY: number): string | undefined {
    const scrollRect = this.scrollEl.getBoundingClientRect()
    const contentY = clientY - scrollRect.top + this.scrollEl.scrollTop
    const rowIdx = Math.floor(contentY / RESOURCE_ROW_HEIGHT)
    if (rowIdx < 0 || rowIdx >= this.resourceIds.length) return undefined
    return this.resourceIds[rowIdx]
  }

  private handleMouseOrTouchMove = (uiEvent: UIEvent) => {
    const { clientX, clientY } = getEventCoordinates(uiEvent)
    this.lastClientX = clientX
    this.lastClientY = clientY

    this.updateFromPosition(clientX, clientY)
  }

  private handleScroll = () => {
    this.updateFromPosition(this.lastClientX, this.lastClientY)
  }

  private updateFromPosition(clientX: number, clientY: number) {
    const newStart = this.getDateTimeFromClientX(clientX)
    if (!newStart) return

    const duration = this.originalEnd.since(this.originalStart)
    const newEnd = newStart.add(duration)

    const newResourceId = this.getResourceFromClientY(clientY)

    const currentStart = this.eventCopy.start as Temporal.ZonedDateTime
    const startChanged =
      newStart.epochNanoseconds !== currentStart.epochNanoseconds
    const resourceChanged =
      newResourceId !== undefined && newResourceId !== this.eventCopy.resourceId

    if (!startChanged && !resourceChanged) return

    this.eventCopy.start = newStart
    this.eventCopy.end = newEnd
    if (newResourceId) this.eventCopy.resourceId = newResourceId
    this.updateCopy(this.eventCopy)
  }

  private handleMouseUpOrTouchEnd = async () => {
    document.removeEventListener('mousemove', this.handleMouseOrTouchMove)
    document.removeEventListener('touchmove', this.handleMouseOrTouchMove)
    document.removeEventListener('mouseup', this.handleMouseUpOrTouchEnd)
    document.removeEventListener('touchend', this.handleMouseUpOrTouchEnd)
    this.scrollEl.removeEventListener('scroll', this.handleScroll)

    this.updateCopy(undefined)

    const shouldAbort = await testIfShouldAbort(
      this.$app,
      this.eventCopy,
      this.originalStart,
      this.originalEnd,
      this.updateCopy
    )
    if (shouldAbort) return

    updateDraggedEvent(this.$app, this.eventCopy, this.originalStart)
  }
}
