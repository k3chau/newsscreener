import { useState, useEffect, useRef } from 'react'

function get(article, path, fallback = null) {
  const parts = path.split('.')
  let val = article
  for (const p of parts) {
    if (val == null) return fallback
    val = val[p]
  }
  return val ?? fallback
}

function formatDateTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ArticleDetail({ article, onClose }) {
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [priceImpact, setPriceImpact] = useState(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState(null)
  const overlayRef = useRef(null)

  const title = get(article, 'raw.title') || get(article, 'title', 'Untitled')
  const publisher = get(article, 'raw.publisher') || get(article, 'publisher', '')
  const publishedAt = get(article, 'raw.published_at') || get(article, 'published_at', '')
  const tickers = get(article, 'raw.tickers') || get(article, 'tickers', [])
  const summary = get(article, 'summary', '')
  const url = get(article, 'raw.url') || get(article, 'url', '')
  const imageUrl = get(article, 'raw.image_url') || get(article, 'image_url', '')
  const keywords = get(article, 'raw.keywords') || get(article, 'keywords', [])
  const sentimentLabel = get(article, 'sentiment.label') || get(article, 'sentiment_label', '')
  const credScore = get(article, 'credibility.score') ?? get(article, 'credibility_score')
  const sector = get(article, 'industry.gics_sector') || get(article, 'gics_sector', '')

  useEffect(() => {
    if (tickers.length === 0 || !publishedAt) return
    const fetchImpact = async () => {
      setPriceLoading(true)
      setPriceError(null)
      setPriceImpact(null)
      try {
        const params = new URLSearchParams({
          ticker: tickers[0],
          timestamp: publishedAt,
        })
        const resp = await fetch(`/api/v1/price/impact?${params}`)
        const data = await resp.json()
        if (data.error) {
          setPriceError(data.error)
        } else {
          setPriceImpact(data)
        }
      } catch {
        setPriceError('Failed to fetch price impact')
      } finally {
        setPriceLoading(false)
      }
    }
    fetchImpact()
  }, [tickers, publishedAt])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    setError(null)
    try {
      const resp = await fetch('/api/v1/news/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          tickers,
          publisher,
          published_at: publishedAt,
          url,
        }),
      })
      const data = await resp.json()
      if (data.error) {
        setError(data.error)
      } else {
        setAnalysis(data.analysis)
      }
    } catch {
      setError('Failed to connect to analysis service')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-12 pb-12 overflow-y-auto"
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-muted hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          {/* Image */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-48 object-cover rounded-lg mb-4 border border-border"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          )}

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground mb-3 pr-8">{title}</h2>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
            {publisher && <span className="font-medium text-foreground">{publisher}</span>}
            {publishedAt && (
              <>
                <span className="text-border">|</span>
                <span>{formatDateTime(publishedAt)}</span>
              </>
            )}
          </div>

          {/* Tickers */}
          {tickers.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tickers</h4>
              <div className="flex flex-wrap gap-2">
                {tickers.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 bg-primary/20 text-primary text-sm font-medium rounded-lg"
                  >
                    ${t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Price Impact */}
          {tickers.length > 0 && publishedAt && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Price Impact &mdash; ${tickers[0]}
              </h4>
              {priceLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Calculating...
                </div>
              )}
              {priceError && (
                <p className="text-sm text-destructive">{priceError}</p>
              )}
              {priceImpact && priceImpact.market_closed && (
                <p className="text-sm text-muted-foreground">Market closed at time of publication</p>
              )}
              {priceImpact && priceImpact.no_data && (
                <p className="text-sm text-muted-foreground">No price data available</p>
              )}
              {priceImpact && priceImpact.impacts && priceImpact.impacts.length > 0 && !priceImpact.market_closed && (
                <div className="flex flex-wrap gap-2">
                  {priceImpact.base_price != null && (
                    <span className="px-3 py-1 bg-muted text-foreground text-sm rounded-lg">
                      Base: ${priceImpact.base_price.toFixed(2)}
                    </span>
                  )}
                  {priceImpact.impacts.map((imp) => {
                    if (imp.change_pct == null) {
                      return (
                        <span
                          key={imp.interval}
                          className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-lg"
                        >
                          {imp.interval}: N/A
                        </span>
                      )
                    }
                    const isPositive = imp.change_pct >= 0
                    return (
                      <span
                        key={imp.interval}
                        className={`px-3 py-1 text-sm font-medium rounded-lg ${
                          isPositive
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                        }`}
                      >
                        {isPositive ? '+' : ''}{imp.change_pct.toFixed(2)}% ({imp.interval})
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {sector && (
              <span className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-lg">
                {sector}
              </span>
            )}
            {sentimentLabel && (
              <span className={`px-3 py-1 text-sm rounded-lg font-medium ${
                sentimentLabel === 'positive' ? 'bg-success/20 text-success'
                : sentimentLabel === 'negative' ? 'bg-destructive/20 text-destructive'
                : 'bg-muted text-muted-foreground'
              }`}>
                {sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1)}
              </span>
            )}
            {credScore != null && (
              <span className={`px-3 py-1 text-sm rounded-lg font-medium ${
                credScore >= 70 ? 'bg-success/20 text-success'
                : credScore >= 40 ? 'bg-warning/20 text-warning'
                : 'bg-destructive/20 text-destructive'
              }`}>
                Credibility: {credScore}/100
              </span>
            )}
          </div>

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Keywords</h4>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((k, i) => (
                  <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Summary</h4>
              <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mb-4">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-secondary rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Read Full Article
              </a>
            )}
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Full Analysis
                </>
              )}
            </button>
          </div>

          {/* Analysis error */}
          {error && (
            <div className="p-3 bg-destructive/20 border border-destructive/30 rounded-lg text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          {/* Analysis result */}
          {analysis && (
            <div className="border border-primary/30 bg-primary/10 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Analysis
              </h4>
              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {analysis.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.includes('**:')) {
                    const [label, ...rest] = line.split('**:')
                    const cleanLabel = label.replace(/^\*\*/, '')
                    return (
                      <div key={i} className="mt-3 first:mt-0">
                        <strong className="text-foreground">{cleanLabel}:</strong>
                        {rest.join('**:')}
                      </div>
                    )
                  }
                  if (line.startsWith('- ')) {
                    return <div key={i} className="ml-4">{line}</div>
                  }
                  if (line.trim() === '') return <div key={i} className="h-2" />
                  return <div key={i}>{line}</div>
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
