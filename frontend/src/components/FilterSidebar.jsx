import { useState } from 'react'
import { GICS_SECTORS, SENTIMENTS } from '../constants'

export default function FilterSidebar({ filters, onChange, watchlist, onAddTicker, onRemoveTicker, onFetchToday, fetching, alertRules, onOpenAlerts }) {
  const update = (key, value) => onChange({ ...filters, [key]: value })
  const [newTicker, setNewTicker] = useState('')

  const handleAddTicker = () => {
    const t = newTicker.trim().toUpperCase()
    if (t && !watchlist.includes(t)) {
      onAddTicker(t)
    }
    setNewTicker('')
  }

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      {/* Fetch today button */}
      <button
        onClick={() => onFetchToday()}
        disabled={fetching}
        className="w-full mb-4 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
      >
        {fetching ? 'Loading...' : "Fetch Today's News"}
      </button>

      {/* Watchlist */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Watchlist</label>
        <div className="flex gap-1 mb-2">
          <input
            type="text"
            placeholder="Add ticker"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTicker()}
            className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddTicker}
            className="px-2 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            +
          </button>
        </div>
        {watchlist.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {watchlist.map((t) => {
              const hasAlert = alertRules?.some((r) => r.ticker === t && r.enabled)
              return (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200"
                >
                  ${t}
                  <button
                    onClick={() => onOpenAlerts?.(t)}
                    className={`${hasAlert ? 'text-yellow-500' : 'text-purple-300'} hover:text-yellow-600`}
                    title={hasAlert ? 'Alert active - click to edit' : 'Set up alert'}
                  >
                    {hasAlert ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 002-2H8a2 2 0 002 2z"/></svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 002-2H8a2 2 0 002 2z"/></svg>
                    )}
                  </button>
                  <button
                    onClick={() => onRemoveTicker(t)}
                    className="text-purple-400 hover:text-purple-700"
                  >
                    x
                  </button>
                </span>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Add tickers to monitor your portfolio</p>
        )}
      </div>

      <hr className="mb-4 border-gray-200" />

      <h2 className="font-semibold text-gray-900 mb-4">Filters</h2>

      {/* Ticker search */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Search Ticker</label>
        <input
          type="text"
          placeholder="e.g. AAPL"
          value={filters.ticker}
          onChange={(e) => update('ticker', e.target.value.toUpperCase())}
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sector filter */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
        <select
          value={filters.sector}
          onChange={(e) => update('sector', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sectors</option>
          {GICS_SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Sentiment filter */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Sentiment</label>
        <select
          value={filters.sentiment}
          onChange={(e) => update('sentiment', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          {SENTIMENTS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Credibility slider */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Min Credibility: {filters.minCredibility}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.minCredibility}
          onChange={(e) => update('minCredibility', Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() =>
          onChange({ ticker: '', sector: '', sentiment: '', minCredibility: 0 })
        }
        className="w-full text-sm text-blue-600 hover:text-blue-800"
      >
        Reset Filters
      </button>
    </aside>
  )
}
