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

  // Fetch price impact when modal opens
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

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on overlay click
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
    } catch (err) {
      setError('Failed to connect to analysis service')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-12 pb-12 overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
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
              className="w-full h-48 object-cover rounded-lg mb-4"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          )}

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-3 pr-8">{title}</h2>

          {/* Meta row: publisher, date/time */}
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
            {publisher && <span className="font-medium text-gray-700">{publisher}</span>}
            {publishedAt && (
              <>
                <span>&middot;</span>
                <span>{formatDateTime(publishedAt)}</span>
              </>
            )}
          </div>

          {/* Tickers */}
          {tickers.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tickers</h4>
              <div className="flex flex-wrap gap-2">
                {tickers.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 bg-purple-50 text-purple-700 text-sm font-medium rounded-full border border-purple-200"
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
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Price Impact &mdash; ${tickers[0]}
              </h4>
              {priceLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Calculating...
                </div>
              )}
              {priceError && (
                <p className="text-sm text-red-600">{priceError}</p>
              )}
              {priceImpact && priceImpact.market_closed && (
                <p className="text-sm text-gray-500">Market closed at time of publication</p>
              )}
              {priceImpact && priceImpact.no_data && (
                <p className="text-sm text-gray-500">No price data available</p>
              )}
              {priceImpact && priceImpact.impacts && priceImpact.impacts.length > 0 && !priceImpact.market_closed && (
                <div className="flex flex-wrap gap-2">
                  {priceImpact.base_price != null && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200">
                      Base: ${priceImpact.base_price.toFixed(2)}
                    </span>
                  )}
                  {priceImpact.impacts.map((imp) => {
                    if (imp.change_pct == null) {
                      return (
                        <span
                          key={imp.interval}
                          className="px-3 py-1 bg-gray-100 text-gray-500 text-sm rounded-full border border-gray-200"
                        >
                          {imp.interval}: N/A
                        </span>
                      )
                    }
                    const isPositive = imp.change_pct >= 0
                    return (
                      <span
                        key={imp.interval}
                        className={`px-3 py-1 text-sm font-medium rounded-full border ${
                          isPositive
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
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

          {/* Tags: sector, sentiment, credibility */}
          <div className="flex flex-wrap gap-2 mb-4">
            {sector && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200">
                {sector}
              </span>
            )}
            {sentimentLabel && (
              <span className={`px-3 py-1 text-sm rounded-full border ${
                sentimentLabel === 'positive' ? 'bg-green-50 text-green-700 border-green-200'
                : sentimentLabel === 'negative' ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                {sentimentLabel}
              </span>
            )}
            {credScore != null && (
              <span className={`px-3 py-1 text-sm rounded-full border ${
                credScore >= 70 ? 'bg-green-50 text-green-700 border-green-200'
                : credScore >= 40 ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                Credibility: {credScore}/100
              </span>
            )}
          </div>

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Keywords</h4>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((k, i) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Summary</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mb-4">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Read Full Article
              </a>
            )}
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors flex items-center gap-2"
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
                'Full Analysis'
              )}
            </button>
          </div>

          {/* Analysis result */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          {analysis && (
            <div className="border border-indigo-200 bg-indigo-50/50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">AI Analysis</h4>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none">
                {analysis.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.includes('**:')) {
                    const [label, ...rest] = line.split('**:')
                    const cleanLabel = label.replace(/^\*\*/, '')
                    return (
                      <div key={i} className="mt-3 first:mt-0">
                        <strong className="text-gray-900">{cleanLabel}:</strong>
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
