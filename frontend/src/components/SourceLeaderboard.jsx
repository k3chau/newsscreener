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
      .slice(0, 20)
  }, [articles])

  if (leaderboard.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Source Leaderboard</h3>
        <p className="text-xs text-gray-400">No publisher data</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Source Leaderboard</h3>
      <div className="overflow-y-auto max-h-64">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="pb-1 pr-2 w-8">#</th>
              <th className="pb-1 pr-2">Publisher</th>
              <th className="pb-1 pr-2 w-28">Credibility</th>
              <th className="pb-1 w-12 text-right">Articles</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row, i) => (
              <tr key={row.publisher} className="border-b border-gray-100">
                <td className="py-1.5 pr-2 text-gray-400 font-medium">{i + 1}</td>
                <td className="py-1.5 pr-2 text-gray-800 truncate max-w-[150px]" title={row.publisher}>
                  {row.publisher}
                </td>
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${row.avg_credibility}%` }}
                      />
                    </div>
                    <span className="text-gray-600 w-7 text-right">{row.avg_credibility}</span>
                  </div>
                </td>
                <td className="py-1.5 text-right text-gray-600">{row.article_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
