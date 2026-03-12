import { useMemo } from 'react'
import { GICS_SECTORS } from '../constants'

function getSector(article) {
  return article?.industry?.gics_sector || article?.gics_sector || null
}

function getSentiment(article) {
  return article?.sentiment?.label || article?.sentiment_label || null
}

const SENTIMENT_BG = {
  positive: 'bg-green-100 border-green-300 text-green-900',
  negative: 'bg-red-100 border-red-300 text-red-900',
  neutral: 'bg-gray-100 border-gray-300 text-gray-700',
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
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Sector Heatmap</h3>
      <div className="grid grid-cols-4 gap-2">
        {sectorData.map(({ sector, total, dominant }) => (
          <div
            key={sector}
            className={`rounded-lg border px-3 py-2 text-center ${
              total === 0 ? 'bg-gray-50 border-gray-200 text-gray-400' : SENTIMENT_BG[dominant]
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
