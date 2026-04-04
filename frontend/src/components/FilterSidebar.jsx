import { useState, useRef } from 'react'
import { GICS_SECTORS, SENTIMENTS } from '../constants'

export default function FilterSidebar({ 
  filters, 
  onChange, 
  watchlist, 
  onAddTicker, 
  onRemoveTicker, 
  onReorderWatchlist,
  onFetchToday, 
  fetching, 
  alertRules, 
  onOpenAlerts,
  mobileOpen,
  onMobileClose
}) {
  const update = (key, value) => onChange({ ...filters, [key]: value })
  const [newTicker, setNewTicker] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const dragRef = useRef(null)

  const handleAddTicker = () => {
    const t = newTicker.trim().toUpperCase()
    if (t && !watchlist.includes(t)) {
      onAddTicker(t)
    }
    setNewTicker('')
  }

  const handleDragStart = (e, index) => {
    setDragIndex(index)
    dragRef.current = index
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      onReorderWatchlist?.(dragIndex, dragOverIndex)
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const sidebarClasses = `
    w-72 shrink-0 bg-card border-r border-border p-4 overflow-y-auto
    lg:relative lg:translate-x-0 lg:block
    fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out
    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
  `

  return (
    <aside className={sidebarClasses}>
      {/* Mobile close button */}
      <button
        onClick={onMobileClose}
        className="lg:hidden absolute top-4 right-4 p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Fetch today button */}
      <button
        onClick={() => onFetchToday()}
        disabled={fetching}
        className="w-full mb-6 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {fetching ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Fetch Today&apos;s News
          </>
        )}
      </button>

      {/* Watchlist */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-foreground">Watchlist</label>
          <span className="text-xs text-muted-foreground">{watchlist.length} tickers</span>
        </div>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Add ticker..."
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTicker()}
            className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
          <button
            onClick={handleAddTicker}
            disabled={!newTicker.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {watchlist.length > 0 ? (
          <div className="space-y-1.5">
            {watchlist.map((t, index) => {
              const hasAlert = alertRules?.some((r) => r.ticker === t && r.enabled)
              const isDragging = dragIndex === index
              const isDragOver = dragOverIndex === index
              
              return (
                <div
                  key={t}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    group flex items-center justify-between px-3 py-2 rounded-lg border cursor-move transition-all
                    ${isDragging ? 'opacity-50 scale-95' : ''}
                    ${isDragOver ? 'border-primary bg-primary/10' : 'border-border bg-muted/50 hover:bg-muted'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                    <span className="text-sm font-medium text-foreground">${t}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenAlerts?.(t)}
                      className={`p-1.5 rounded-md transition-colors ${
                        hasAlert 
                          ? 'text-warning hover:bg-warning/20' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                      title={hasAlert ? 'Alert active - click to edit' : 'Set up alert'}
                    >
                      <svg className="w-4 h-4" fill={hasAlert ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onRemoveTicker(t)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 px-4 rounded-lg border border-dashed border-border bg-muted/30">
            <svg className="w-8 h-8 mx-auto text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-xs text-muted-foreground">Add tickers to monitor your portfolio</p>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-6 mb-6" />

      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filters
      </h2>

      {/* Ticker search */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-muted-foreground mb-2">Search Ticker</label>
        <input
          type="text"
          placeholder="e.g. AAPL"
          value={filters.ticker}
          onChange={(e) => update('ticker', e.target.value.toUpperCase())}
          className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
        />
      </div>

      {/* Sector filter */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-muted-foreground mb-2">Sector</label>
        <select
          value={filters.sector}
          onChange={(e) => update('sector', e.target.value)}
          className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all appearance-none cursor-pointer"
        >
          <option value="">All Sectors</option>
          {GICS_SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Sentiment filter */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-muted-foreground mb-2">Sentiment</label>
        <div className="flex gap-2">
          <button
            onClick={() => update('sentiment', '')}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              !filters.sentiment 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-secondary'
            }`}
          >
            All
          </button>
          {SENTIMENTS.map((s) => (
            <button
              key={s}
              onClick={() => update('sentiment', s)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                filters.sentiment === s 
                  ? s === 'positive' ? 'bg-success text-success-foreground'
                    : s === 'negative' ? 'bg-destructive text-destructive-foreground'
                    : 'bg-muted-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              }`}
            >
              {s.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Credibility slider */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Min Credibility
        </label>
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            value={filters.minCredibility}
            onChange={(e) => update('minCredibility', Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
          />
          <div 
            className="absolute -top-6 transform -translate-x-1/2 px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded"
            style={{ left: `${filters.minCredibility}%` }}
          >
            {filters.minCredibility}
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() => onChange({ ticker: '', sector: '', sentiment: '', minCredibility: 0 })}
        className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border hover:border-foreground/20 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Reset Filters
      </button>
    </aside>
  )
}
