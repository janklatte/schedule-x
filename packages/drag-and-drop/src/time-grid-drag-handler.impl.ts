import CalendarAppSingleton from '@schedule-x/shared/src/interfaces/calendar/calendar-app-singleton'
import { addTimePointsToDateTime } from '@schedule-x/shared/src/utils/stateless/time/time-points/string-conversion'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import { DayBoundariesDateTime } from '@schedule-x/shared/src/types/day-boundaries-date-time'
import { addDays } from '@schedule-x/shared/src/utils/stateless/time/date-time-mutation/adding'
import { DateRange } from '@schedule-x/shared/src/types/date-range'
import { setDateInDateTime } from '@schedule-x/shared/src/utils/stateless/time/date-time-mutation/date-time-mutation'
import { getTimeGridEventCopyElementId } from '@schedule-x/shared/src/utils/stateless/strings/selector-generators'
import TimeGridDragHandler from '@schedule-x/shared/src/interfaces/drag-and-drop/time-grid-drag-handler.interface'
import { updateDraggedEvent } from './utils/stateless/update-dragged-event'
import { EventCoordinates } from '@schedule-x/shared/src/interfaces/shared/event-coordinates'
import { getEventCoordinates } from '@schedule-x/shared/src/utils/stateless/dom/get-event-coordinates'
import { getTimePointsPerPixel } from '@schedule-x/shared/src/utils/stateless/calendar/time-points-per-pixel'
import { testIfShouldAbort } from './utils/stateless/test-if-should-abort'

export default class TimeGridDragHandlerImpl implements TimeGridDragHandler {
  private readonly dayWidth: number
  private readonly startY: number
  private readonly startX
  private lastIntervalDiff = 0
  private lastDaySlotsDiff = 0
  private lastDaysDiff = 0
  private readonly originalStart: Temporal.ZonedDateTime
  private readonly originalEnd: Temporal.ZonedDateTime
  private readonly resourceIdToDaySlotIdx: Map<string, number> = new Map()
  private readonly daySlotIdxToResourceId: Map<number, string> = new Map()

  constructor(
    private $app: CalendarAppSingleton,
    private eventCoordinates: EventCoordinates,
    private eventCopy: CalendarEventInternal,
    private updateCopy: (newCopy: CalendarEventInternal | undefined) => void,
    private dayBoundariesDateTime: DayBoundariesDateTime,
    private readonly CHANGE_THRESHOLD_IN_TIME_POINTS: number
  ) {
    this.dayWidth = (
      ($app.elements.calendarWrapper as HTMLElement).querySelector(
        '.sx__time-grid-day'
      ) as HTMLDivElement
    ).clientWidth
    this.startY = this.eventCoordinates.clientY
    this.startX = this.eventCoordinates.clientX
    this.originalStart = Temporal.ZonedDateTime.from(
      this.eventCopy.start.toString()
    )
    this.originalEnd = Temporal.ZonedDateTime.from(
      this.eventCopy.end.toString()
    )

    const ressourceWeekView = $app.elements.calendarWrapper?.querySelector(
      '.sx__resource-week-date-axis'
    ) as HTMLElement
    if (ressourceWeekView) {
      Array.from($app.config.resources.value).forEach(([key], index) => {
        this.resourceIdToDaySlotIdx.set(key, index)
        this.daySlotIdxToResourceId.set(index, key)
      })
    }

    this.init()
  }

  private getDaySlotIdx(resourceId: string | undefined): number {
    if (!resourceId) return 0
    return this.resourceIdToDaySlotIdx.get(resourceId) || 0
  }

  private init() {
    document.addEventListener('mousemove', this.handleMouseOrTouchMove)
    document.addEventListener('mouseup', this.handleMouseUpOrTouchEnd)

    document.addEventListener('touchmove', this.handleMouseOrTouchMove, {
      passive: false,
    })
    document.addEventListener('touchend', this.handleMouseUpOrTouchEnd)
  }

  private handleMouseOrTouchMove = (uiEvent: UIEvent) => {
    const { clientX, clientY } = getEventCoordinates(uiEvent)
    const pixelDiffY = clientY - this.startY
    const timePointsDiffY = pixelDiffY * this.timePointsPerPixel()
    const currentIntervalDiff = Math.round(
      timePointsDiffY / this.CHANGE_THRESHOLD_IN_TIME_POINTS
    )
    const pixelDiffX = clientX - this.startX
    const currentDaySlotsDiff = Math.round(pixelDiffX / this.dayWidth)

    this.handleVerticalMouseOrTouchMove(currentIntervalDiff)
    this.handleHorizontalMouseOrTouchMove(currentDaySlotsDiff)
  }

  private timePointsPerPixel(): number {
    return getTimePointsPerPixel(this.$app)
  }

  private handleVerticalMouseOrTouchMove(currentIntervalDiff: number) {
    if (currentIntervalDiff === this.lastIntervalDiff) return

    const pointsToAdd =
      currentIntervalDiff > this.lastIntervalDiff
        ? this.CHANGE_THRESHOLD_IN_TIME_POINTS *
          (currentIntervalDiff - this.lastIntervalDiff)
        : -this.CHANGE_THRESHOLD_IN_TIME_POINTS *
          (this.lastIntervalDiff - currentIntervalDiff)
    this.setTimeForEventCopy(pointsToAdd)
    this.lastIntervalDiff = currentIntervalDiff
  }

  private setTimeForEventCopy(pointsToAdd: number) {
    const newStart = addTimePointsToDateTime(
      this.eventCopy.start as Temporal.ZonedDateTime,
      pointsToAdd
    )
    const newEnd = addTimePointsToDateTime(
      this.eventCopy.end as Temporal.ZonedDateTime,
      pointsToAdd
    )
    const stringNewStart = newStart.toString()
    const stringNewEnd = newEnd.toString()
    const stringDayBoundariesStart = this.dayBoundariesDateTime.start.toString()
    const stringDayBoundariesEnd = this.dayBoundariesDateTime.end.toString()
    console.log('stringNewStart', stringNewStart)
    console.log('stringNewEnd', stringNewEnd)
    console.log('stringDayBoundariesStart', stringDayBoundariesStart)
    console.log('stringDayBoundariesEnd', stringDayBoundariesEnd)
    let currentDiff = this.lastDaysDiff
    if (this.$app.config.direction === 'rtl') currentDiff = -currentDiff

    if (
      newStart.epochNanoseconds <
      (
        addDays(
          this.dayBoundariesDateTime.start,
          currentDiff
        ) as Temporal.ZonedDateTime
      ).epochNanoseconds
    )
      return
    if (
      newEnd.epochNanoseconds >
      (
        addDays(
          this.dayBoundariesDateTime.end,
          currentDiff
        ) as Temporal.ZonedDateTime
      ).epochNanoseconds
    )
      return

    this.eventCopy.start = newStart
    this.eventCopy.end = newEnd
    this.updateCopy(this.eventCopy)
  }

  private mod(n: number, m: number): number {
    // https://web.archive.org/web/20090717035140if_/javascript.about.com/od/problemsolving/a/modulobug.htm
    return ((n % m) + m) % m
  }

  private handleHorizontalMouseOrTouchMove(totalDaySlotsDiff: number) {
    if (totalDaySlotsDiff === this.lastDaySlotsDiff) return

    let diffToAdd = totalDaySlotsDiff - this.lastDaySlotsDiff
    if (this.$app.config.direction === 'rtl') diffToAdd = -diffToAdd

    let daysToAdd = diffToAdd
    let newResourceId: string | undefined = undefined

    if (this.eventCopy.resourceId && this.resourceIdToDaySlotIdx.size > 0) {
      const numberOfResources = this.resourceIdToDaySlotIdx.size

      const startDaySlotIdx = this.getDaySlotIdx(this.eventCopy.resourceId)
      const newDaySlotIdx = this.mod(
        startDaySlotIdx + diffToAdd,
        numberOfResources
      )

      const slotDiff = newDaySlotIdx - startDaySlotIdx

      daysToAdd = Math.floor((diffToAdd - slotDiff) / numberOfResources)
      newResourceId = this.daySlotIdxToResourceId.get(newDaySlotIdx)
    }

    const newStartDate = addDays(
      this.eventCopy.start,
      daysToAdd
    ) as Temporal.ZonedDateTime
    const newEndDate = addDays(
      this.eventCopy.end,
      daysToAdd
    ) as Temporal.ZonedDateTime
    const newStart = setDateInDateTime(
      this.eventCopy.start as Temporal.ZonedDateTime,
      newStartDate
    )
    const newEnd = setDateInDateTime(
      this.eventCopy.end as Temporal.ZonedDateTime,
      newEndDate
    )

    if (
      newStart.epochNanoseconds <
      (this.$app.calendarState.range.value as DateRange).start.epochNanoseconds
    )
      return
    if (
      newEnd.epochNanoseconds >
      (this.$app.calendarState.range.value as DateRange).end.epochNanoseconds
    )
      return

    this.setDateAndResourceIdForEventCopy(newStart, newEnd, newResourceId)
    this.transformEventCopyPosition(totalDaySlotsDiff)
    this.lastDaySlotsDiff = totalDaySlotsDiff
    this.lastDaysDiff = this.lastDaysDiff + daysToAdd
  }

  private setDateAndResourceIdForEventCopy(
    newStart: Temporal.ZonedDateTime,
    newEnd: Temporal.ZonedDateTime,
    newResourceId: string | undefined
  ) {
    if (newResourceId) {
      this.eventCopy.resourceId = newResourceId
    }
    this.eventCopy.start = newStart
    this.eventCopy.end = newEnd
    this.updateCopy(this.eventCopy)
  }

  private transformEventCopyPosition(totalDaysDiff: number) {
    const copyElement = (
      this.$app.elements.calendarWrapper as HTMLElement
    ).querySelector(
      '#' + getTimeGridEventCopyElementId(this.eventCopy.id)
    ) as HTMLDivElement
    copyElement.style.transform = `translateX(calc(${
      totalDaysDiff * 100
    }% + ${totalDaysDiff}px))`
  }

  private handleMouseUpOrTouchEnd = async () => {
    document.removeEventListener('mousemove', this.handleMouseOrTouchMove)
    document.removeEventListener('touchmove', this.handleMouseOrTouchMove)
    document.removeEventListener('mouseup', this.handleMouseUpOrTouchEnd)
    document.removeEventListener('touchend', this.handleMouseUpOrTouchEnd)
    this.updateCopy(undefined)

    const shouldAbort = await testIfShouldAbort(
      this.$app,
      this.eventCopy,
      this.originalStart,
      this.originalEnd,
      this.updateCopy
    )
    if (shouldAbort) return

    this.updateOriginalEvent()
  }

  private updateOriginalEvent() {
    if (this.lastIntervalDiff === 0 && this.lastDaySlotsDiff === 0) return

    const dayIsSame = this.lastDaySlotsDiff === 0
    const eventElement = document.querySelector(
      `[data-event-id="${this.eventCopy.id}"]`
    )
    const shouldHideEventToPreventFlickering =
      !dayIsSame && eventElement instanceof HTMLElement
    if (shouldHideEventToPreventFlickering) eventElement.style.display = 'none'

    updateDraggedEvent(this.$app, this.eventCopy, this.originalStart)
  }
}
