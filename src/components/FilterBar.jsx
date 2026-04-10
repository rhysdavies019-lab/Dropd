import { Filter } from 'lucide-react'
import { GRADES, CATEGORIES, EXTENSIONS } from '../data/mockDomains'

// Filter bar displayed above the domain feed in Dashboard
export default function FilterBar({ filters, onChange }) {
  function update(key, value) {
    onChange({ ...filters, [key]: value })
  }

  const selectClass =
    'bg-surface border border-border text-sm text-white rounded-lg px-3 py-2 ' +
    'focus:outline-none focus:border-lime/60 cursor-pointer hover:border-subtle transition-colors'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-muted text-sm">
        <Filter size={14} />
        <span>Filter</span>
      </div>

      {/* Grade filter */}
      <select
        value={filters.grade}
        onChange={e => update('grade', e.target.value)}
        className={selectClass}
      >
        <option value="">All grades</option>
        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
      </select>

      {/* Niche / category filter */}
      <select
        value={filters.category}
        onChange={e => update('category', e.target.value)}
        className={selectClass}
      >
        <option value="">All niches</option>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Extension filter */}
      <select
        value={filters.extension}
        onChange={e => update('extension', e.target.value)}
        className={selectClass}
      >
        <option value="">All extensions</option>
        {EXTENSIONS.map(e => <option key={e} value={e}>{e}</option>)}
      </select>

      {/* Clear */}
      {(filters.grade || filters.category || filters.extension) && (
        <button
          onClick={() => onChange({ grade: '', category: '', extension: '' })}
          className="text-xs text-lime hover:text-lime-dim transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
