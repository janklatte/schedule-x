import { useRef, useEffect, useCallback, useState } from 'preact/hooks'
import { CalendarAppSingleton } from '@schedule-x/shared/src'

export const useTimelineScroll = (
  $app: CalendarAppSingleton,
  mode: 'time' | 'day' = 'time'
) => {
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const gridScrollRef = useRef<HTMLDivElement>(null)
  const resourceNamesRef = useRef<HTMLDivElement>(null)
  const [gridScrollbarWidth, setGridScrollbarWidth] = useState(0)

  const scrollToToday = useCallback(() => {
    // In day mode all days are always visible (no horizontal overflow),
    // so there is nothing to scroll to horizontally. Skipping the scroll
    // prevents a coordinate-system mismatch from desyncing the header and grid.
    if (mode === 'day') return

    const day = $app.datePickerState.selectedDate.value
    const dayElement = headerScrollRef.current?.querySelector(
      `.sx__resource-timeline-day-header[data-date="${day}"]`
    )

    if (dayElement && gridScrollRef.current && headerScrollRef.current) {
      const left =
        dayElement.getBoundingClientRect().left -
        headerScrollRef.current.getBoundingClientRect().left +
        headerScrollRef.current.scrollLeft
      gridScrollRef.current.scrollTo({ top: 0, left: left, behavior: 'auto' })
      headerScrollRef.current.scrollTo({
        top: 0,
        left: left,
        behavior: 'auto',
      })
    }
  }, [mode])

  // Synchronize horizontal scroll between header and grid
  useEffect(() => {
    const headerEl = headerScrollRef.current
    const gridEl = gridScrollRef.current

    if (!headerEl || !gridEl) return

    const syncHeaderToGrid = () => {
      if (headerEl && gridEl) headerEl.scrollLeft = gridEl.scrollLeft
    }
    const syncGridToHeader = () => {
      if (headerEl && gridEl) gridEl.scrollLeft = headerEl.scrollLeft
    }
    gridEl.addEventListener('scroll', syncHeaderToGrid)
    headerEl.addEventListener('scroll', syncGridToHeader)

    return () => {
      gridEl.removeEventListener('scroll', syncHeaderToGrid)
      headerEl.removeEventListener('scroll', syncGridToHeader)
    }
  }, [])

  // Synchronize vertical scroll between resource names and grid
  useEffect(() => {
    const resourceNamesEl = resourceNamesRef.current
    const gridEl = gridScrollRef.current
    if (!resourceNamesEl || !gridEl) return

    const syncResourceNamesToGrid = () => {
      if (resourceNamesEl && gridEl)
        resourceNamesEl.scrollTop = gridEl.scrollTop
    }
    const syncGridToResourceNames = () => {
      if (resourceNamesEl && gridEl)
        gridEl.scrollTop = resourceNamesEl.scrollTop
    }
    gridEl.addEventListener('scroll', syncResourceNamesToGrid)
    resourceNamesEl.addEventListener('scroll', syncGridToResourceNames)

    return () => {
      gridEl.removeEventListener('scroll', syncResourceNamesToGrid)
      resourceNamesEl.removeEventListener('scroll', syncGridToResourceNames)
    }
  }, [])

  // Measure vertical scrollbar width to align header with grid
  useEffect(() => {
    const gridEl = gridScrollRef.current
    if (!gridEl) return

    const measure = () =>
      setGridScrollbarWidth(gridEl.offsetWidth - gridEl.clientWidth)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(gridEl)
    return () => observer.disconnect()
  }, [])

  // Scroll to today on date change
  useEffect(() => {
    const id = requestAnimationFrame(() => scrollToToday())
    return () => cancelAnimationFrame(id)
  }, [$app.datePickerState.selectedDate.value])

  return {
    headerScrollRef,
    gridScrollRef,
    resourceNamesRef,
    gridScrollbarWidth,
  }
}
