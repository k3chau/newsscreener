import { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const LINE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

const TREND_ICON = { rising: '\u2191', falling: '\u2193', stable: '\u2192' }
const TREND_COLOR = {
  rising: 'text-green-600',
  falling: 'text-red-600',
  stable: 'text-gray-500',
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
        // Default: show top 5
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
      const point = { date: date.slice(5) } // MM-DD
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Keyword Trends</h3>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-xs text-gray-400">
          Loading keyword data...
        </div>
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-gray-400">
          No keyword data available
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
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

          {/* Keyword pills */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.map((kw, i) => (
              <button
                key={kw.keyword}
                onClick={() => toggleKeyword(kw.keyword)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  activeKeywords.has(kw.keyword)
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {kw.keyword}
                <span className="ml-1 text-gray-400">({kw.total})</span>
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
