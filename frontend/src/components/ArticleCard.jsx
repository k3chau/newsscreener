import { SENTIMENT_COLORS } from '../constants'

function get(article, path, fallback = null) {
  // Articles may arrive as flat (from REST) or nested (from WS with raw.*)
  const parts = path.split('.')
  let val = article
  for (const p of parts) {
    if (val == null) return fallback
    val = val[p]
  }
  return val ?? fallback
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ArticleCard({ article, onClick }) {
  // Support both WS shape (nested under raw.*) and REST shape (flat)
  const title = get(article, 'raw.title') || get(article, 'title', 'Untitled')
  const publisher = get(article, 'raw.publisher') || get(article, 'publisher', '')
  const publishedAt = get(article, 'raw.published_at') || get(article, 'published_at', '')
  const tickers = get(article, 'raw.tickers') || get(article, 'tickers', [])
  const summary = get(article, 'summary', '')
  const sentimentLabel = get(article, 'sentiment.label') || get(article, 'sentiment_label', '')
  const sector = get(article, 'industry.gics_sector') || get(article, 'gics_sector', '')
  const credScore = get(article, 'credibility.score') ?? get(article, 'credibility_score')

  const colors = SENTIMENT_COLORS[sentimentLabel] || SENTIMENT_COLORS.neutral

  return (
    <div
      onClick={() => onClick?.(article)}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1">{title}</h3>
        {sentimentLabel && (
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
          >
            {sentimentLabel}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        {publisher && <span>{publisher}</span>}
        {publisher && publishedAt && <span>&middot;</span>}
        {publishedAt && <span>{formatTime(publishedAt)}</span>}
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {sector && (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
            {sector}
          </span>
        )}
        {tickers.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200"
          >
            ${t}
          </span>
        ))}
      </div>

      {/* Summary */}
      {summary && <p className="text-sm text-gray-600 mb-3 line-clamp-3">{summary}</p>}

      {/* Credibility bar */}
      {credScore != null && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-0.5">
            <span>Credibility</span>
            <span>{credScore}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                credScore >= 70 ? 'bg-green-500' : credScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${credScore}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
