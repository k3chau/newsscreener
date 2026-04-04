import { useMemo } from 'react'
import { GICS_SECTORS } from '../constants'

function getSector(article) {
  return article?.industry?.gics_sector || article?.gics_sector || null
}

function getSentiment(article) {
  return article?.sentiment?.label || article?.sentiment_label || null
}

const SENTIMENT_BG = {
  positive: 'bg-success/20 border-success/30 text-success',
  negative: 'bg-destructive/20 border-destructive/30 text-destructive',
  neutral: 'bg-muted border-border text-muted-foreground',
}

export default function SectorHeatmap({ articles }) {
  const sectorData = useMemo(() => {
    const map = {}
    for (const sector of GICS_SECTORS) {
      map[sector] = { total: 0, positive: 0, negative: 0, neutral: 0 }
    }

    for (const a of articles) {
      const sector = getSector(a)
      if (!sector || !map[sector]) continue
      map[sector].total++
      const s = getSentiment(a)
      if (s === 'positive') map[sector].positive++
      else if (s === 'negative') map[sector].negative++
      else map[sector].neutral++
    }

    return GICS_SECTORS.map((sector) => {
      const d = map[sector]
      let dominant = 'neutral'
      if (d.positive > d.negative && d.positive > d.neutral) dominant = 'positive'
      else if (d.negative > d.positive && d.negative > d.neutral) dominant = 'negative'
      return { sector, ...d, dominant }
    })
  }, [articles])

  return (
    <div className="bg-muted/30 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        Sector Heatmap
      </h3>
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
        {sectorData.map(({ sector, total, dominant }) => (
          <div
            key={sector}
            className={`rounded-lg border px-3 py-2 text-center transition-all hover:scale-105 ${
              total === 0 ? 'bg-muted/50 border-border text-muted-foreground' : SENTIMENT_BG[dominant]
            }`}
          >
            <p className="text-xs font-medium truncate" title={sector}>
              {sector}
            </p>
            <p className="text-lg font-bold">{total}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
