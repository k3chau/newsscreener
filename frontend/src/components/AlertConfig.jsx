import { useState, useEffect, useCallback } from 'react'

const SENTIMENTS = ['any', 'positive', 'negative', 'neutral']

export default function AlertConfig({ isOpen, onClose, ticker, watchlist }) {
  const [config, setConfig] = useState({ email: '', rules: [] })
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [selectedTicker, setSelectedTicker] = useState(ticker || '')

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/alerts/config')
      if (res.ok) {
        const data = await res.json()
        setConfig({
          email: data.email || '',
          rules: data.rules || [],
        })
      }
    } catch {
      /* ignore */
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/alerts/history?limit=10')
      if (res.ok) setHistory(await res.json())
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchConfig()
      fetchHistory()
    }
  }, [isOpen, fetchConfig, fetchHistory])

  useEffect(() => {
    if (ticker) setSelectedTicker(ticker)
  }, [ticker])

  const getRule = (t) => config.rules.find((r) => r.ticker === t)

  const updateRule = (t, updates) => {
    const existing = config.rules.find((r) => r.ticker === t)
    if (existing) {
      setConfig({
        ...config,
        rules: config.rules.map((r) => (r.ticker === t ? { ...r, ...updates } : r)),
      })
    } else {
      setConfig({
        ...config,
        rules: [
          ...config.rules,
          { ticker: t, sentiment: 'any', min_credibility: 0, enabled: true, ...updates },
        ],
      })
    }
  }

  const removeRule = (t) => {
    setConfig({ ...config, rules: config.rules.filter((r) => r.ticker !== t) })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/v1/alerts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await fetch('/api/v1/alerts/test', { method: 'POST' })
      await fetchHistory()
    } finally {
      setTesting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Alert Configuration
          </h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notification Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={config.email || ''}
              onChange={(e) => setConfig({ ...config, email: e.target.value || null })}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">Optional. Requires SMTP server configured.</p>
          </div>

          {/* Per-ticker rules */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Ticker Alert Rules
            </label>
            {watchlist.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add tickers to your watchlist first.</p>
            ) : (
              <div className="space-y-3">
                {watchlist.map((t) => {
                  const rule = getRule(t)
                  const isActive = rule?.enabled ?? false
                  return (
                    <div
                      key={t}
                      className={`border rounded-lg p-3 transition-all ${
                        selectedTicker === t ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">${t}</span>
                        <div className="flex items-center gap-2">
                          {rule && (
                            <button
                              onClick={() => removeRule(t)}
                              className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={(e) => updateRule(t, { enabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-foreground after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-primary-foreground" />
                          </label>
                        </div>
                      </div>

                      {isActive && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Sentiment</label>
                            <select
                              value={rule?.sentiment || 'any'}
                              onChange={(e) => updateRule(t, { sentiment: e.target.value })}
                              className="w-full bg-input border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              {SENTIMENTS.map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">
                              Min Credibility: {rule?.min_credibility ?? 0}
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={rule?.min_credibility ?? 0}
                              onChange={(e) =>
                                updateRule(t, { min_credibility: Number(e.target.value) })
                              }
                              className="w-full accent-primary"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2.5 border border-border text-sm font-medium rounded-lg hover:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
            >
              {testing ? 'Sending...' : 'Test Alert'}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Recent Alerts
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs border border-border rounded-lg p-2 bg-muted/30"
                  >
                    <span className="font-semibold text-primary shrink-0">{h.ticker}</span>
                    <span className="text-foreground/80 truncate flex-1">{h.title}</span>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(h.triggered_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
