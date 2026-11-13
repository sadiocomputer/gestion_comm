import { CalendarDays } from 'lucide-react'
import { todayISO } from '../../lib/format'
import { PERIOD_LABELS } from '../../lib/period'
import type { PeriodFilterState } from '../../lib/usePeriodFilter'
import { TextField } from '../TextField'
import { Chips } from './Chips'

/**
 * Filtre par date : périodes toutes faites en pastilles + « Choisir les dates »
 * qui ouvre deux champs Du / Au. S'utilise avec usePeriodFilter().
 */
export function PeriodFilter({ filter, label = 'Période' }: { filter: PeriodFilterState; label?: string }) {
  const { period, range, options } = filter
  return (
    <div className="space-y-3">
      <Chips
        label={label}
        options={options.map((value) => ({
          value,
          label: PERIOD_LABELS[value],
          icon: value === 'custom' ? CalendarDays : undefined,
        }))}
        value={period}
        onChange={filter.setPeriod}
      />
      {period === 'custom' && range && (
        <div className="grid max-w-md grid-cols-2 gap-3">
          <TextField
            label="Du"
            type="date"
            max={range.to}
            value={range.from}
            onChange={(e) => e.target.value && filter.setDates({ from: e.target.value })}
          />
          <TextField
            label="Au"
            type="date"
            min={range.from}
            max={todayISO()}
            value={range.to}
            onChange={(e) => e.target.value && filter.setDates({ to: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}
