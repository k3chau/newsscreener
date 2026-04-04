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

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-foreground capitalize">{payload[0].name}</p>
        <p className="text-xs text-muted-foreground">{payload[0].value} articles</p>
      </div>
    )
  }
  return null
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

    return { sentimentData, topSectors, avgCredibility, sentimentCounts }
  }, [articles])

  return (
    <div className="bg-card border-b border-border px-4 lg:px-6 py-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Total articles */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Articles Today</p>
          </div>
          <p className="text-3xl font-bold text-foreground">{articles.length}</p>
        </div>

        {/* Sentiment breakdown */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Sentiment</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.sentimentData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={28}
                    innerRadius={16}
                    strokeWidth={0}
                  >
                    {stats.sentimentData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-muted-foreground">+{stats.sentimentCounts.positive}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-muted-foreground">-{stats.sentimentCounts.negative}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-muted-foreground">~{stats.sentimentCounts.neutral}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top sectors */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Top Sectors</p>
          </div>
          <div className="space-y-1.5">
            {stats.topSectors.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sector data</p>
            ) : (
              stats.topSectors.map(([sector, count], index) => (
                <div key={sector} className="flex items-center justify-between">
                  <span className="text-xs text-foreground truncate flex-1">{sector}</span>
                  <span className={`text-xs font-medium ${
                    index === 0 ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Avg credibility */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Avg Credibility</p>
          </div>
          <div className="flex items-end gap-2">
            <p className={`text-3xl font-bold ${
              stats.avgCredibility >= 70 ? 'text-success' 
              : stats.avgCredibility >= 40 ? 'text-warning' 
              : 'text-destructive'
            }`}>
              {stats.avgCredibility}
            </p>
            <span className="text-sm text-muted-foreground mb-1">/100</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                stats.avgCredibility >= 70 ? 'bg-success' 
                : stats.avgCredibility >= 40 ? 'bg-warning' 
                : 'bg-destructive'
              }`}
              style={{ width: `${stats.avgCredibility}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
