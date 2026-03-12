import { useState, useMemo, useCallback, useEffect } from 'react'
import useWebSocket from './hooks/useWebSocket'
import StatsBar from './components/StatsBar'
import FilterSidebar from './components/FilterSidebar'
import ArticleFeed from './components/ArticleFeed'
import ArticleDetail from './components/ArticleDetail'
import MacroCalendar from './components/MacroCalendar'
import SectorHeatmap from './components/SectorHeatmap'
import SourceLeaderboard from './components/SourceLeaderboard'
import KeywordTrends from './components/KeywordTrends'
import AlertConfig from './components/AlertConfig'

const WS_URL =
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
  window.location.host +
  '/ws/articles'

const DEFAULT_FILTERS = { ticker: '', sector: '', sentiment: '', minCredibility: 0 }
const WATCHLIST_KEY = 'newsscreener_watchlist'

function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || []
  } catch {
    return []
  }
}

function get(article, path) {
  const parts = path.split('.')
  let val = article
  for (const p of parts) {
    if (val == null) return null
    val = val[p]
  }
  return val ?? null
}

function matchFilters(article, filters, watchlist) {
  // If watchlist has tickers and no manual ticker filter, filter to watchlist
  const tickerFilter = filters.ticker
  const tickers = get(article, 'raw.tickers') || get(article, 'tickers') || []

  if (tickerFilter) {
    if (!tickers.some((t) => t.toUpperCase().includes(tickerFilter))) return false
  } else if (watchlist.length > 0) {
    const upperTickers = tickers.map((t) => t.toUpperCase())
    if (!watchlist.some((w) => upperTickers.includes(w))) return false
  }

  if (filters.sector) {
    const sector = get(article, 'industry.gics_sector') || get(article, 'gics_sector') || ''
    if (sector !== filters.sector) return false
  }
  if (filters.sentiment) {
    const label = get(article, 'sentiment.label') || get(article, 'sentiment_label') || ''
    if (label !== filters.sentiment) return false
  }
  if (filters.minCredibility > 0) {
    const score = get(article, 'credibility.score') ?? get(article, 'credibility_score') ?? 0
    if (score < filters.minCredibility) return false
  }
  return true
}

export default function App() {
  const { articles, connected, loaded, fetching, fetchToday } = useWebSocket(WS_URL)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [watchlist, setWatchlist] = useState(loadWatchlist)
  const [watchlistActive, setWatchlistActive] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [calendarVisible, setCalendarVisible] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [alertModalOpen, setAlertModalOpen] = useState(false)
  const [alertTicker, setAlertTicker] = useState('')
  const [alertRules, setAlertRules] = useState([])

  // Fetch alert rules on mount to show bell state in sidebar
  useEffect(() => {
    fetch('/api/v1/alerts/config')
      .then((r) => r.ok ? r.json() : { rules: [] })
      .then((data) => setAlertRules(data.rules || []))
      .catch(() => {})
  }, [alertModalOpen])

  const saveWatchlist = useCallback((list) => {
    setWatchlist(list)
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list))
  }, [])

  const addTicker = useCallback((t) => {
    saveWatchlist([...loadWatchlist(), t])
  }, [saveWatchlist])

  const removeTicker = useCallback((t) => {
    saveWatchlist(loadWatchlist().filter((x) => x !== t))
  }, [saveWatchlist])

  const filtered = useMemo(
    () => articles.filter((a) => matchFilters(a, filters, watchlistActive ? watchlist : [])),
    [articles, filters, watchlist, watchlistActive]
  )

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">News Screener</h1>
        <div className="flex items-center gap-4 text-sm">
          <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                showAnalytics
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
              }`}
            >
              Analytics
            </button>
          <button
              onClick={() => setCalendarVisible(!calendarVisible)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                calendarVisible
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {calendarVisible ? 'Calendar ON' : 'Calendar OFF'}
            </button>
          {watchlist.length > 0 && (
            <button
              onClick={() => setWatchlistActive(!watchlistActive)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                watchlistActive
                  ? 'bg-purple-100 text-purple-700 border-purple-300'
                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {watchlistActive ? 'Watchlist ON' : 'Watchlist OFF'}
            </button>
          )}
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-gray-500">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </header>

      {/* Stats */}
      <StatsBar articles={filtered} />

      {/* Macro Calendar */}
      <MacroCalendar visible={calendarVisible} />

      {/* Analytics panel */}
      {showAnalytics && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-3 gap-6">
            <SectorHeatmap articles={filtered} />
            <SourceLeaderboard articles={filtered} />
            <KeywordTrends />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          watchlist={watchlist}
          onAddTicker={addTicker}
          onRemoveTicker={removeTicker}
          onFetchToday={fetchToday}
          fetching={fetching}
          alertRules={alertRules}
          onOpenAlerts={(t) => { setAlertTicker(t); setAlertModalOpen(true) }}
        />
        <ArticleFeed articles={filtered} loaded={loaded} onSelectArticle={setSelectedArticle} />
      </div>

      {/* Article detail modal */}
      {selectedArticle && (
        <ArticleDetail article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}

      {/* Alert config modal */}
      <AlertConfig
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        ticker={alertTicker}
        watchlist={watchlist}
      />
    </div>
  )
}
