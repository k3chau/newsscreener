import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS } from '../constants'

function getSentiment(article) {
  return article?.sentiment?.label || article?.raw?.sentiment?.label || null
}

function getSector(article) {
  return article?.industry?.gics_sector || article?.raw?.industry?.gics_sector || null
}

function getCredibility(article) {
  return article?.credibility?.score ?? article?.raw?.credibility?.score ?? null
}

export default function StatsBar({ articles }) {
  const stats = useMemo(() => {
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 }
    const sectorCounts = {}
    let credSum = 0
    let credCount = 0

    for (const a of articles) {
      const s = getSentiment(a)
      if (s && sentimentCounts[s] !== undefined) sentimentCounts[s]++

      const sec = getSector(a)
      if (sec) sectorCounts[sec] = (sectorCounts[sec] || 0) + 1

      const c = getCredibility(a)
      if (c !== null) {
        credSum += c
        credCount++
      }
    }

    const sentimentData = Object.entries(sentimentCounts).map(([name, value]) => ({ name, value }))
    const topSectors = Object.entries(sectorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    const avgCredibility = credCount > 0 ? Math.round(credSum / credCount) : 0

    return { sentimentData, topSectors, avgCredibility }
  }, [articles])

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="grid grid-cols-4 gap-6">
        {/* Total articles */}
        <div>
          <p className="text-sm text-gray-500">Articles Today</p>
          <p className="text-2xl font-bold text-gray-900">{articles.length}</p>
        </div>

        {/* Sentiment pie */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Sentiment</p>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.sentimentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={28}
                  innerRadius={14}
                >
                  {stats.sentimentData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top sectors */}
        <div>
          <p className="text-sm text-gray-500">Top Sectors</p>
          <div className="mt-1 space-y-0.5">
            {stats.topSectors.length === 0 && (
              <p className="text-xs text-gray-400">No data</p>
            )}
            {stats.topSectors.map(([sector, count]) => (
              <p key={sector} className="text-xs text-gray-700 truncate">
                {sector} <span className="text-gray-400">({count})</span>
              </p>
            ))}
          </div>
        </div>

        {/* Avg credibility */}
        <div>
          <p className="text-sm text-gray-500">Avg Credibility</p>
          <p className="text-2xl font-bold text-gray-900">{stats.avgCredibility}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${stats.avgCredibility}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
