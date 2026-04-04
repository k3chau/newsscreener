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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const reorderWatchlist = useCallback((fromIndex, toIndex) => {
    const newList = [...watchlist]
    const [removed] = newList.splice(fromIndex, 1)
    newList.splice(toIndex, 0, removed)
    saveWatchlist(newList)
  }, [watchlist, saveWatchlist])

  const filtered = useMemo(
    () => articles.filter((a) => matchFilters(a, filters, watchlistActive ? watchlist : [])),
    [articles, filters, watchlist, watchlistActive]
  )

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-muted text-foreground hover:bg-secondary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-foreground">News Screener</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Toggle buttons */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showAnalytics
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setCalendarVisible(!calendarVisible)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                calendarVisible
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              Calendar
            </button>
            {watchlist.length > 0 && (
              <button
                onClick={() => setWatchlistActive(!watchlistActive)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  watchlistActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                Watchlist {watchlistActive ? 'ON' : 'OFF'}
              </button>
            )}
          </div>
          
          {/* Connection status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
            <span
              className={`w-2 h-2 rounded-full ${connected ? 'bg-success animate-pulse-glow' : 'bg-destructive'}`}
            />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Stats */}
      <StatsBar articles={filtered} />

      {/* Macro Calendar */}
      <MacroCalendar visible={calendarVisible} />

      {/* Analytics panel */}
      {showAnalytics && (
        <div className="bg-card border-b border-border px-4 lg:px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <SectorHeatmap articles={filtered} />
            <SourceLeaderboard articles={filtered} />
            <KeywordTrends />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          watchlist={watchlist}
          onAddTicker={addTicker}
          onRemoveTicker={removeTicker}
          onReorderWatchlist={reorderWatchlist}
          onFetchToday={fetchToday}
          fetching={fetching}
          alertRules={alertRules}
          onOpenAlerts={(t) => { setAlertTicker(t); setAlertModalOpen(true) }}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
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
