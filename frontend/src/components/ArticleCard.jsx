import { SENTIMENT_COLORS } from '../constants'

function get(article, path, fallback = null) {
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
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function ArticleCard({ article, onClick }) {
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
    <article
      onClick={() => onClick?.(article)}
      className="group bg-card rounded-xl border border-border p-4 lg:p-5 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-foreground text-sm lg:text-base leading-tight flex-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        {sentimentLabel && (
          <span
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1)}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        {publisher && (
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            {publisher}
          </span>
        )}
        {publisher && publishedAt && <span className="text-border">|</span>}
        {publishedAt && (
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(publishedAt)}
          </span>
        )}
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {sector && (
          <span className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg">
            {sector}
          </span>
        )}
        {tickers.slice(0, 5).map((t) => (
          <span
            key={t}
            className="px-2.5 py-1 bg-primary/20 text-primary text-xs font-medium rounded-lg"
          >
            ${t}
          </span>
        ))}
        {tickers.length > 5 && (
          <span className="px-2.5 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-lg">
            +{tickers.length - 5} more
          </span>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{summary}</p>
      )}

      {/* Credibility bar */}
      {credScore != null && (
        <div className="pt-3 border-t border-border">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-muted-foreground font-medium">Credibility Score</span>
            <span className={`font-bold ${
              credScore >= 70 ? 'text-success' : credScore >= 40 ? 'text-warning' : 'text-destructive'
            }`}>
              {credScore}/100
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                credScore >= 70 ? 'bg-success' : credScore >= 40 ? 'bg-warning' : 'bg-destructive'
              }`}
              style={{ width: `${credScore}%` }}
            />
          </div>
        </div>
      )}
    </article>
  )
}
