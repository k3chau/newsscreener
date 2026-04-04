import { useEffect, useRef } from 'react'
import AIChat from './AIChat'

export default function TradingViewHeatmap({ onClose }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear any existing content
    const widgetContainer = containerRef.current.querySelector('.tradingview-widget-container__widget')
    if (widgetContainer) {
      widgetContainer.innerHTML = ''
    }

    // Create and inject the script
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      dataSource: 'SPX500',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      grouping: 'sector',
      locale: 'en',
      symbolUrl: '',
      colorTheme: 'dark',
      exchanges: [],
      hasTopBar: true,
      isDataSetEnabled: true,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: '100%',
      height: '100%'
    })

    const widgetDiv = containerRef.current.querySelector('.tradingview-widget-container__widget')
    if (widgetDiv) {
      widgetDiv.appendChild(script)
    }

    return () => {
      // Cleanup on unmount
      if (widgetDiv) {
        widgetDiv.innerHTML = ''
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-foreground">Market Heatmap</h1>
          </div>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary">
            S&P 500
          </span>
        </div>
        
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-secondary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium">Back to News</span>
        </button>
      </header>

      {/* TradingView Widget */}
      <div className="flex-1 overflow-hidden" ref={containerRef}>
        <div className="tradingview-widget-container h-full w-full">
          <div className="tradingview-widget-container__widget h-full w-full"></div>
          <div className="tradingview-widget-copyright absolute bottom-2 right-4 text-xs text-muted-foreground">
            <a 
              href="https://www.tradingview.com/heatmap/stock/" 
              rel="noopener noreferrer" 
              target="_blank"
              className="text-primary hover:underline"
            >
              Stock Heatmap
            </a>
            <span> by TradingView</span>
          </div>
        </div>
      </div>

      {/* AI Chat */}
      <AIChat contextType="stocks" />
    </div>
  )
}
