import { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const LINE_COLORS = [
  '#facc15', '#22c55e', '#ef4444', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

const TREND_ICON = { rising: '\u2191', falling: '\u2193', stable: '\u2192' }
const TREND_COLOR = {
  rising: 'text-success',
  falling: 'text-destructive',
  stable: 'text-muted-foreground',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function KeywordTrends() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [activeKeywords, setActiveKeywords] = useState(new Set())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/v1/analytics/keyword-trends?days=${days}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        setData(json)
        setActiveKeywords(new Set(json.slice(0, 5).map((k) => k.keyword)))
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [days])

  const chartData = useMemo(() => {
    if (data.length === 0) return []
    const dates = data[0]?.counts?.map((c) => c.date) || []
    return dates.map((date) => {
      const point = { date: date.slice(5) }
      for (const kw of data) {
        if (activeKeywords.has(kw.keyword)) {
          const entry = kw.counts.find((c) => c.date === date)
          point[kw.keyword] = entry?.count || 0
        }
      }
      return point
    })
  }, [data, activeKeywords])

  const toggleKeyword = (kw) => {
    setActiveKeywords((prev) => {
      const next = new Set(prev)
      if (next.has(kw)) next.delete(kw)
      else next.add(kw)
      return next
    })
  }

  return (
    <div className="bg-muted/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          Keyword Trends
        </h3>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-xs bg-input border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
          <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading keyword data...
        </div>
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
          No keyword data available
        </div>
      ) : (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a3a3a3' }} stroke="#262626" />
                <YAxis tick={{ fontSize: 10, fill: '#a3a3a3' }} allowDecimals={false} stroke="#262626" />
                <Tooltip content={<CustomTooltip />} />
                {data
                  .filter((kw) => activeKeywords.has(kw.keyword))
                  .map((kw, i) => (
                    <Line
                      key={kw.keyword}
                      type="monotone"
                      dataKey={kw.keyword}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {data.map((kw) => (
              <button
                key={kw.keyword}
                onClick={() => toggleKeyword(kw.keyword)}
                className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                  activeKeywords.has(kw.keyword)
                    ? 'bg-primary/20 border-primary/30 text-primary'
                    : 'bg-muted border-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                {kw.keyword}
                <span className="ml-1 opacity-60">({kw.total})</span>
                <span className={`ml-1 ${TREND_COLOR[kw.trend]}`}>
                  {TREND_ICON[kw.trend]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
