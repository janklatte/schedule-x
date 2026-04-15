/* eslint-disable max-lines */
import CalendarAppSingleton from '@schedule-x/shared/src/interfaces/calendar/calendar-app-singleton'
import DragToCreatePlugin from './drag-to-create-plugin.interface'
import { randomStringId } from '@schedule-x/shared/src/utils/stateless/strings/random'
import { addTimePointsToDateTime } from '@schedule-x/shared/src/utils/stateless/time/time-points/string-conversion'
import CalendarEventExternal from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import { getEventCoordinates } from '@schedule-x/shared/src/utils/stateless/dom/get-event-coordinates'
import { DateRange } from '@schedule-x/shared/src/types/date-range'

/**
 * Handles the drag-to-create interaction logic
 */
export default class DragToCreateHandler {
  private enabled = true
  private isDragging = false
  private dragStartTime: Temporal.ZonedDateTime | null = null
  private dragEndTime: Temporal.ZonedDateTime | null = null
  private dragStartPercentageOfDay: number | null = null
  private dragEndPercentageOfDay: number | null = null
  private previewElement: HTMLElement | null = null
  private dragStartElement: HTMLElement | null = null
  private dragStartResourceId: string | undefined = undefined
  private eventWidth: number = 100

  // Timeline-specific state
  private isTimelineDrag = false
  private timelineDragStartXFraction: number | null = null
  private timelineDragEndXFraction: number | null = null
  private timelineScrollEl: HTMLElement | null = null
  private timelineInnerEl: HTMLElement | null = null
  private timelinePreviewRow: HTMLElement | null = null

  constructor(
    private $app: CalendarAppSingleton,
    private plugin: DragToCreatePlugin
  ) {
    this.eventWidth = $app.config.weekOptions.value.eventWidth
  }

  initialize(): void {
    // We'll attach listeners to the calendar wrapper
    const wrapper = this.$app.elements.calendarWrapper
    if (!wrapper) return

    // Use event delegation - listen on the wrapper and check target
    wrapper.addEventListener('mousedown', this.handleMouseDown)
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseup', this.handleMouseUp)
  }

  cleanup(): void {
    const wrapper = this.$app.elements.calendarWrapper
    if (wrapper) {
      wrapper.removeEventListener('mousedown', this.handleMouseDown)
    }
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)

    if (this.previewElement) {
      this.previewElement.remove()
      this.previewElement = null
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled && this.isDragging) {
      this.cancelDrag()
    }
  }

  private handleMouseDown = (e: UIEvent): void => {
    if (!this.enabled) return

    // Don't start dragging if right mouse button is clicked
    if (e instanceof MouseEvent && e.button === 2) {
      return
    }

    const target = e.target as HTMLElement

    // Check for timeline row first (before time-grid/date-grid check)
    const timelineRow = target.closest(
      '.sx__resource-timeline-row'
    ) as HTMLElement | null
    const isTimelineRow = !!timelineRow && !target.closest('[data-event-id]')

    if (isTimelineRow && timelineRow) {
      const calendarWrapper = this.$app.elements.calendarWrapper as HTMLElement
      const gridScrollable = calendarWrapper.querySelector(
        '.sx__resource-timeline-grid-scrollable'
      ) as HTMLElement
      this.timelineScrollEl = gridScrollable?.children[1] as HTMLElement
      this.timelineInnerEl = this.timelineScrollEl
        ?.firstElementChild as HTMLElement

      if (!this.timelineScrollEl || !this.timelineInnerEl) return

      this.isTimelineDrag = true
      this.timelinePreviewRow = timelineRow
      this.dragStartResourceId = timelineRow.dataset.personId

      const { fraction, dateTime } = this.getTimeAndFractionFromTimeline(e)
      this.dragStartTime = dateTime
      this.dragEndTime = dateTime
      this.timelineDragStartXFraction = fraction
      this.timelineDragEndXFraction = fraction
      this.isDragging = true
      e.preventDefault()
      return
    }

    // Only start drag on time-grid-day or date-grid-day elements (empty space)
    const isTimeGridDay = target.classList.contains('sx__time-grid-day')
    const isDateGridDay = target.classList.contains('sx__date-grid-day')

    if (!isTimeGridDay && !isDateGridDay) return

    // Don't interfere with existing events
    if (target.closest('.sx__event')) return

    this.dragStartElement = target
    const result = this.getDateTimeFromElement(target, e)

    if (!result) return

    this.dragStartTime = result.dateTime
    this.dragStartPercentageOfDay = result.percentageOfDay
    this.dragEndTime = result.dateTime
    this.dragEndPercentageOfDay = result.percentageOfDay
    this.dragStartResourceId = target.dataset.resourceId
    this.isDragging = true

    // Prevent text selection during drag
    e.preventDefault()
  }

  /**
   * Handle mouse move event - update drag preview
   */
  private handleMouseMove = (e: UIEvent): void => {
    if (!this.isDragging || !this.dragStartTime) return

    // Handle timeline drag branch
    if (this.isTimelineDrag) {
      const { fraction, dateTime } = this.getTimeAndFractionFromTimeline(e)
      this.dragEndTime = dateTime
      this.timelineDragEndXFraction = fraction
      this.updateTimelinePreview()
      return
    }

    const { clientX, clientY } = getEventCoordinates(e)
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement
    if (!target) return

    const result = this.getDateTimeFromElement(target, e)
    if (!result) return

    this.dragEndTime = result.dateTime
    this.dragEndPercentageOfDay = result.percentageOfDay
    this.updatePreview()
  }

  /**
   * Handle mouse up event - create the event
   */
  private handleMouseUp = (e: UIEvent): void => {
    if (!this.isDragging) return

    e.preventDefault()

    if (this.dragStartTime && this.dragEndTime) {
      this.createEvent()
    }

    this.cancelDrag()
  }

  /**
   * Get the X fraction and dateTime from a timeline mouse position
   */
  private getTimeAndFractionFromTimeline(e: UIEvent): {
    fraction: number
    dateTime: Temporal.ZonedDateTime
  } {
    const { clientX } = getEventCoordinates(e)
    const scrollEl = this.timelineScrollEl!
    const innerEl = this.timelineInnerEl!

    const scrollRect = scrollEl.getBoundingClientRect()
    const contentX = clientX - scrollRect.left + scrollEl.scrollLeft
    const fraction = Math.max(0, Math.min(1, contentX / innerEl.scrollWidth))

    const range = this.$app.calendarState.range.value as DateRange
    const daysInWeek =
      range.start.toPlainDate().until(range.end.toPlainDate()).days + 1
    const weekStart = range.start
      .toPlainDate()
      .toZonedDateTime(this.$app.config.timezone.value)

    const dayStartTP = this.$app.config.dayBoundaries.value.start
    const timePointsPerDay = this.$app.config.timePointsPerDay
    const gridStep = this.$app.config.weekOptions.value.gridStep
    const intervalTP = gridStep * (100 / 60)

    const totalTP = daysInWeek * timePointsPerDay
    const rawTP = fraction * totalTP
    const snappedTP = Math.round(rawTP / intervalTP) * intervalTP
    const clampedTP = Math.max(0, Math.min(totalTP, snappedTP))

    const dayOffset = Math.min(
      Math.floor(clampedTP / timePointsPerDay),
      daysInWeek - 1
    )
    const tpInDay = (clampedTP % timePointsPerDay) + dayStartTP

    const dayStart = weekStart
      .add({ days: dayOffset })
      .toPlainDate()
      .toZonedDateTime(this.$app.config.timezone.value)
    const dateTime = addTimePointsToDateTime(dayStart, tpInDay)

    return { fraction, dateTime }
  }

  /**
   * Update the visual preview for timeline drag-to-create
   */
  private updateTimelinePreview(): void {
    if (
      this.timelineDragStartXFraction === null ||
      this.timelineDragEndXFraction === null ||
      !this.timelinePreviewRow
    )
      return

    const startFraction = Math.min(
      this.timelineDragStartXFraction,
      this.timelineDragEndXFraction
    )
    const endFraction = Math.max(
      this.timelineDragStartXFraction,
      this.timelineDragEndXFraction
    )

    if (!this.previewElement) {
      this.previewElement = document.createElement('div')
      this.previewElement.className = 'sx__drag-to-create-preview sx__event'
      this.previewElement.style.position = 'absolute'
      this.previewElement.style.pointerEvents = 'none'
      this.previewElement.style.opacity = '0.5'
      this.previewElement.style.zIndex = '1000'
      this.previewElement.style.top = '2px'
      this.previewElement.style.height = 'calc(100% - 4px)'
      this.previewElement.style.borderRadius = '2px'
      this.timelinePreviewRow.appendChild(this.previewElement)
    }

    const leftPct = startFraction * 100
    const widthPct = Math.max(0, (endFraction - startFraction) * 100)

    this.previewElement.style.left = `${leftPct}%`
    this.previewElement.style.width = `${widthPct}%`

    if (this.dragStartTime && this.dragEndTime) {
      this.previewElement.innerHTML = `<div style="padding: 2px 4px; font-size: var(--sx-font-extra-small);">${this.getEventTime(this.dragStartTime, this.dragEndTime)}</div>`
    }
  }

  /**
   * Get date/time from a calendar element and mouse position
   */
  private getDateTimeFromElement(
    element: HTMLElement,
    e: UIEvent
  ): { dateTime: Temporal.ZonedDateTime; percentageOfDay: number } | null {
    // For time grid days
    const timeGridDay = element.closest('.sx__time-grid-day') as HTMLElement
    if (timeGridDay) {
      return this.getTimeFromTimeGrid(timeGridDay, e)
    }

    return null
  }

  /**
   * Calculate time from position in time grid
   */
  private getTimeFromTimeGrid(
    element: HTMLElement,
    e: UIEvent
  ): { dateTime: Temporal.ZonedDateTime; percentageOfDay: number } | null {
    const dateStr = element.dataset.timeGridDate
    if (!dateStr) return null

    const rect = element.getBoundingClientRect()
    const { clientY } = getEventCoordinates(e)
    const relativeY = clientY - rect.top
    const percentageOfDay = Math.max(0, Math.min(1, relativeY / rect.height))

    const dayStartTimePoint = this.$app.config.dayBoundaries.value.start
    const dayEndTimePoint = this.$app.config.dayBoundaries.value.end
    const totalTimePoints = dayEndTimePoint - dayStartTimePoint
    const intervalTimePoints =
      this.$app.config.weekOptions.value.gridStep * (100 / 60)
    const timePointsFromStart =
      Math.round((percentageOfDay * totalTimePoints) / intervalTimePoints) *
      intervalTimePoints

    const date = Temporal.PlainDate.from(dateStr)
    const parsedDateTime = addTimePointsToDateTime(
      date.toZonedDateTime(this.$app.config.timezone.value),
      dayStartTimePoint + timePointsFromStart
    )
    return {
      dateTime: parsedDateTime,
      percentageOfDay: timePointsFromStart / totalTimePoints,
    }
  }

  getEventTime = (
    start: Temporal.ZonedDateTime,
    end: Temporal.ZonedDateTime
  ) => {
    const localizeArgs = [
      this.$app.config.locale.value,
      { hour: 'numeric', minute: 'numeric' },
    ] as const

    const localizedStartTime = start.toLocaleString(...localizeArgs)

    if (start === end) {
      return localizedStartTime
    }

    const localizedEndTime = end.toLocaleString(...localizeArgs)
    return `${localizedStartTime} – ${localizedEndTime}`
  }

  /**
   * Update the visual preview of the drag (time-grid version)
   */
  private updatePreview(): void {
    if (
      !this.dragStartTime ||
      !this.dragEndTime ||
      !this.dragStartElement ||
      this.dragStartPercentageOfDay === null ||
      this.dragEndPercentageOfDay === null
    )
      return

    // Determine start and end (handle dragging up or down)
    const isForwardDrag =
      this.dragStartPercentageOfDay! < this.dragEndPercentageOfDay!
    const startPercentageOfDay = isForwardDrag
      ? this.dragStartPercentageOfDay
      : this.dragEndPercentageOfDay
    const endPercentageOfDay = isForwardDrag
      ? this.dragEndPercentageOfDay
      : this.dragStartPercentageOfDay

    // Create or update preview element
    if (!this.previewElement) {
      this.previewElement = document.createElement('div')
      this.previewElement.className = 'sx__drag-to-create-preview sx__event'
      this.previewElement.style.position = 'absolute'
      this.previewElement.style.pointerEvents = 'none'
      this.previewElement.style.opacity = '0.5'
      this.previewElement.style.zIndex = '1000'
      this.previewElement.style.fontSize = 'var(--sx-font-extra-small)'

      this.dragStartElement.appendChild(this.previewElement)
    }

    this.previewElement.innerHTML = `<div class="sx__time-grid-event-inner"><div class="sx__time-grid-event-time"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sx__event-icon"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M12 8V12L15 15" stroke="var(--sx-color-on-primary-container)" stroke-width="2" stroke-linecap="round"></path><circle cx="12" cy="12" r="9" stroke="var(--sx-color-on-primary-container)" stroke-width="2"></circle></g></svg>${this.getEventTime(this.dragStartTime, this.dragEndTime)}</div></div>`

    const startTop = startPercentageOfDay * 100
    const endTop = endPercentageOfDay * 100
    const height = endTop - startTop

    this.previewElement.style.top = `${startTop}%`
    this.previewElement.style.height = `${height}%`
    this.previewElement.style.left = '0'
    this.previewElement.style.right = '0'
    this.previewElement.style.width = `${this.eventWidth}%`
  }

  /**
   * Create the actual calendar event
   */
  private createEvent(): void {
    if (!this.dragStartTime || !this.dragEndTime) return

    // Determine start and end (handle dragging up or down)
    const isForwardDrag =
      Temporal.ZonedDateTime.compare(this.dragStartTime, this.dragEndTime) <= 0
    const startTime = isForwardDrag ? this.dragStartTime : this.dragEndTime
    let endTime = isForwardDrag ? this.dragEndTime : this.dragStartTime

    // Ensure minimum duration of one snap interval
    const duration = endTime.since(startTime)
    const intervalMinutes = this.$app.config.weekOptions.value.gridStep
    if (duration.total('minutes') < intervalMinutes) {
      endTime = startTime.add({ minutes: intervalMinutes })
    }

    // Create the event using the calendar's events API
    const newEvent: CalendarEventExternal = {
      id: randomStringId(),
      start: startTime,
      end: endTime,
      title: 'New Event',
      resourceId: this.dragStartResourceId,
    }

    this.plugin.getOnEventCreateCallback()(newEvent)
  }

  /**
   * Cancel the current drag operation
   */
  private cancelDrag(): void {
    this.isDragging = false
    this.isTimelineDrag = false
    this.timelineDragStartXFraction = null
    this.timelineDragEndXFraction = null
    this.timelineScrollEl = null
    this.timelineInnerEl = null
    this.timelinePreviewRow = null
    this.dragStartTime = null
    this.dragEndTime = null
    this.dragStartElement = null
    this.dragStartPercentageOfDay = null
    this.dragEndPercentageOfDay = null

    if (this.previewElement) {
      this.previewElement.remove()
      this.previewElement = null
    }
  }
}
