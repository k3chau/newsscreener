import { useMemo } from 'react'

function getPublisher(article) {
  return article?.publisher || article?.raw?.publisher || ''
}

function getCredibility(article) {
  return article?.credibility?.score ?? article?.credibility_score ?? null
}

export default function SourceLeaderboard({ articles }) {
  const leaderboard = useMemo(() => {
    const map = {}

    for (const a of articles) {
      const pub = getPublisher(a)
      if (!pub) continue
      if (!map[pub]) map[pub] = { totalCred: 0, credCount: 0, count: 0 }
      map[pub].count++
      const cred = getCredibility(a)
      if (cred !== null) {
        map[pub].totalCred += cred
        map[pub].credCount++
      }
    }

    return Object.entries(map)
      .map(([publisher, d]) => ({
        publisher,
        avg_credibility: d.credCount > 0 ? Math.round((d.totalCred / d.credCount) * 10) / 10 : 0,
        article_count: d.count,
      }))
      .sort((a, b) => b.avg_credibility - a.avg_credibility)
      .slice(0, 10)
  }, [articles])

  return (
    <div className="bg-muted/30 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
        Source Leaderboard
      </h3>
      
      {leaderboard.length === 0 ? (
        <p className="text-xs text-muted-foreground">No publisher data</p>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((row, i) => (
            <div key={row.publisher} className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                i === 0 ? 'bg-primary text-primary-foreground' 
                : i === 1 ? 'bg-muted-foreground text-background'
                : i === 2 ? 'bg-warning text-warning-foreground'
                : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate" title={row.publisher}>
                  {row.publisher}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        row.avg_credibility >= 70 ? 'bg-success'
                        : row.avg_credibility >= 40 ? 'bg-warning'
                        : 'bg-destructive'
                      }`}
                      style={{ width: `${row.avg_credibility}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">{row.avg_credibility}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{row.article_count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
