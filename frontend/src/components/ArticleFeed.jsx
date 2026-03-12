import ArticleCard from './ArticleCard'

export default function ArticleFeed({ articles, loaded, onSelectArticle }) {
  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p className="text-lg">Loading today's articles...</p>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-lg">No articles yet</p>
          <p className="text-sm mt-1">Stored articles and live arrivals will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {articles.map((article, i) => (
        <ArticleCard key={article?.raw?.id || article?.id || i} article={article} onClick={onSelectArticle} />
      ))}
    </div>
  )
}
