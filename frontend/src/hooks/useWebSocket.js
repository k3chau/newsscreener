import { useEffect, useRef, useCallback, useState } from 'react'

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]

export default function useWebSocket(url) {
  const [articles, setArticles] = useState([])
  const [connected, setConnected] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [fetching, setFetching] = useState(false)
  const wsRef = useRef(null)
  const retriesRef = useRef(0)
  const mountedRef = useRef(true)
  const knownIdsRef = useRef(new Set())

  const fetchToday = useCallback((ticker) => {
    setFetching(true)

    // Fetch from Polygon REST API directly
    let queryUrl = `/api/v1/news/fetch?limit=100`
    if (ticker) queryUrl += `&ticker=${encodeURIComponent(ticker)}`

    return fetch(queryUrl)
      .then((res) => {
        if (!res.ok) {
          console.error('[NewsScreener] Fetch failed:', res.status, res.statusText)
          return { articles: [] }
        }
        return res.json()
      })
      .then((data) => {
        if (!mountedRef.current) return
        const newArticles = data.articles || []
        console.log(`[NewsScreener] Fetched ${newArticles.length} articles`)
        knownIdsRef.current.clear()
        for (const a of newArticles) {
          if (a.id) knownIdsRef.current.add(a.id)
        }
        setArticles(newArticles)
        setLoaded(true)
        setFetching(false)
      })
      .catch((err) => {
        console.error('[NewsScreener] Fetch error:', err)
        setLoaded(true)
        setFetching(false)
      })
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchToday()
  }, [fetchToday])

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      retriesRef.current = 0
    }

    ws.onclose = () => {
      setConnected(false)
      if (!mountedRef.current) return
      const delay = RECONNECT_DELAYS[Math.min(retriesRef.current, RECONNECT_DELAYS.length - 1)]
      retriesRef.current += 1
      setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'article' && msg.data) {
          const id = msg.data?.raw?.id || msg.data?.id
          if (id && knownIdsRef.current.has(id)) return
          if (id) knownIdsRef.current.add(id)
          setArticles((prev) => [msg.data, ...prev].slice(0, 500))
        }
      } catch {
        // ignore malformed messages
      }
    }
  }, [url])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      wsRef.current?.close()
    }
  }, [connect])

  const clearArticles = useCallback(() => {
    setArticles([])
    knownIdsRef.current.clear()
  }, [])

  return { articles, connected, loaded, fetching, fetchToday, clearArticles }
}
