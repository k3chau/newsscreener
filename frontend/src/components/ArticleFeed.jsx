import ArticleCard from './ArticleCard'

export default function ArticleFeed({ articles, loaded, onSelectArticle }) {
  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-lg font-medium text-foreground">Loading articles...</p>
          <p className="text-sm text-muted-foreground mt-1">Fetching the latest market news</p>
        </div>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">No articles found</p>
          <p className="text-sm text-muted-foreground">
            Add tickers to your watchlist or adjust your filters to see relevant news
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {articles.length} article{articles.length !== 1 ? 's' : ''}
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Live updates
          </div>
        </div>
        {articles.map((article, i) => (
          <ArticleCard key={article?.raw?.id || article?.id || i} article={article} onClick={onSelectArticle} />
        ))}
      </div>
    </div>
  )
}
