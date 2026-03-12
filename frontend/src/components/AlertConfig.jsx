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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Alert Configuration</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={config.email || ''}
              onChange={(e) => setConfig({ ...config, email: e.target.value || null })}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Optional. Requires SMTP server configured.</p>
          </div>

          {/* Per-ticker rules */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ticker Alert Rules
            </label>
            {watchlist.length === 0 ? (
              <p className="text-xs text-gray-400">Add tickers to your watchlist first.</p>
            ) : (
              <div className="space-y-3">
                {watchlist.map((t) => {
                  const rule = getRule(t)
                  const isActive = rule?.enabled ?? false
                  return (
                    <div
                      key={t}
                      className={`border rounded-md p-3 ${
                        selectedTicker === t ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-800">${t}</span>
                        <div className="flex items-center gap-2">
                          {rule && (
                            <button
                              onClick={() => removeRule(t)}
                              className="text-xs text-red-500 hover:text-red-700"
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
                            <div className="w-8 h-4 bg-gray-300 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full" />
                          </label>
                        </div>
                      </div>

                      {isActive && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Sentiment</label>
                            <select
                              value={rule?.sentiment || 'any'}
                              onChange={(e) => updateRule(t, { sentiment: e.target.value })}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {SENTIMENTS.map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">
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
                              className="w-full accent-blue-500"
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
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 disabled:text-gray-400 transition-colors"
            >
              {testing ? 'Sending...' : 'Test Alert'}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recent Alerts
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs border border-gray-100 rounded p-2 bg-gray-50"
                  >
                    <span className="font-medium text-purple-700 shrink-0">{h.ticker}</span>
                    <span className="text-gray-600 truncate flex-1">{h.title}</span>
                    <span className="text-gray-400 shrink-0">
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
