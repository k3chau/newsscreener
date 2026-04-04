export const GICS_SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate',
]

export const SENTIMENTS = ['positive', 'negative', 'neutral']

export const SENTIMENT_COLORS = {
  positive: { 
    bg: 'bg-success/20', 
    text: 'text-success', 
    border: 'border-success/30',
    dot: 'bg-success'
  },
  negative: { 
    bg: 'bg-destructive/20', 
    text: 'text-destructive', 
    border: 'border-destructive/30',
    dot: 'bg-destructive'
  },
  neutral: { 
    bg: 'bg-muted', 
    text: 'text-muted-foreground', 
    border: 'border-border',
    dot: 'bg-muted-foreground'
  },
}

export const CHART_COLORS = ['#22c55e', '#ef4444', '#a3a3a3']
