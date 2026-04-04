import { useState, useEffect, useCallback } from 'react'

const IMPACT_STYLES = {
  high: 'bg-destructive/20 text-destructive',
  medium: 'bg-warning/20 text-warning',
  low: 'bg-muted text-muted-foreground',
}

const IMPACT_DOT = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-muted-foreground',
}

function isToday(dateStr) {
  if (!dateStr) return false
  const eventDate = dateStr.slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  return eventDate === today
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  } catch {
    return dateStr.slice(0, 10)
  }
}

function formatValue(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number') return val.toLocaleString()
  return String(val)
}

export default function MacroCalendar({ visible }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/v1/calendar/events?country=US&days_ahead=7')
      const data = await resp.json()
      if (data.error) {
        setError(data.error)
        setEvents([])
      } else {
        setEvents(data.events || [])
      }
    } catch {
      setError('Failed to fetch calendar events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    fetchEvents()
    const interval = setInterval(fetchEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [visible, fetchEvents])

  if (!visible) return null

  const grouped = {}
  for (const ev of events) {
    const dateKey = ev.date ? ev.date.slice(0, 10) : 'Unknown'
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(ev)
  }

  return (
    <div className="bg-card border-b border-border">
      <div className="px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Macro Economic Calendar
          </h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-destructive" /> High
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-warning" /> Med
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" /> Low
            </span>
            {loading && (
              <span className="text-primary flex items-center gap-1">
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating...
              </span>
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-destructive mb-2">{error}</p>
        )}

        {events.length === 0 && !loading && !error && (
          <p className="text-xs text-muted-foreground">No upcoming events</p>
        )}

        {Object.keys(grouped).length > 0 && (
          <div className="max-h-56 overflow-y-auto space-y-3">
            {Object.entries(grouped).map(([dateKey, dateEvents]) => {
              const today = isToday(dateKey)
              return (
                <div key={dateKey}>
                  <p className={`text-xs font-medium mb-2 ${today ? 'text-primary' : 'text-muted-foreground'}`}>
                    {formatDate(dateKey)}{today ? ' (Today)' : ''}
                  </p>
                  <div className="space-y-1">
                    {dateEvents.map((ev, i) => (
                      <div
                        key={`${dateKey}-${i}`}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${
                          today ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                        }`}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${IMPACT_DOT[ev.impact] || IMPACT_DOT.low}`} />
                        <span className="text-muted-foreground w-12 shrink-0 font-mono">{formatTime(ev.date)}</span>
                        <span className="font-medium text-foreground flex-1 truncate">{ev.event}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${IMPACT_STYLES[ev.impact] || IMPACT_STYLES.low}`}>
                          {ev.impact}
                        </span>
                        <span className="text-foreground w-16 text-right font-mono" title="Actual">
                          {formatValue(ev.actual)}
                        </span>
                        <span className="text-muted-foreground w-16 text-right font-mono" title="Forecast">
                          {formatValue(ev.forecast)}
                        </span>
                        <span className="text-muted-foreground w-16 text-right font-mono" title="Previous">
                          {formatValue(ev.previous)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
