import { useState } from 'preact/hooks'
import { useSignalEffect } from '@preact/signals'
import { getTimeAxisHours } from '@schedule-x/calendar/src/utils/stateless/time/time-axis/time-axis'
import { CalendarAppSingleton } from '@schedule-x/shared/src'

export type TimelineMode = 'time' | 'day'

export const useGridSteps = (
  $app: CalendarAppSingleton,
  mode: TimelineMode = 'time'
) => {
  const [gridSteps, setGridSteps] = useState<
    { hour: number; minute: number }[]
  >([])

  useSignalEffect(() => {
    if (mode === 'day') {
      setGridSteps([])
      return
    }

    const hourSteps = getTimeAxisHours(
      $app.config.dayBoundaries.value,
      $app.config.isHybridDay
    )

    const result: { hour: number; minute: number }[] = []

    hourSteps.forEach((hour) => {
      if ($app.config.weekOptions.value.gridStep === 60) {
        result.push({ hour: hour, minute: 0 })
      }
      if ($app.config.weekOptions.value.gridStep === 30) {
        result.push({ hour: hour, minute: 0 }, { hour: hour, minute: 30 })
      }
      if ($app.config.weekOptions.value.gridStep === 15) {
        result.push(
          { hour: hour, minute: 0 },
          { hour: hour, minute: 15 },
          { hour: hour, minute: 30 },
          { hour: hour, minute: 45 }
        )
      }
    })

    setGridSteps(result)
  })

  return gridSteps
}
