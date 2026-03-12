import { useState, useEffect, useCallback } from 'react'

const IMPACT_STYLES = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-500 border-gray-200',
}

const IMPACT_DOT = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
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
    } catch (err) {
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

  // Group events by date
  const grouped = {}
  for (const ev of events) {
    const dateKey = ev.date ? ev.date.slice(0, 10) : 'Unknown'
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(ev)
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Macro Economic Calendar</h2>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> High
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" /> Med
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400" /> Low
            </span>
            {loading && <span className="text-blue-500">Updating...</span>}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        )}

        {events.length === 0 && !loading && !error && (
          <p className="text-xs text-gray-400">No upcoming events</p>
        )}

        {Object.keys(grouped).length > 0 && (
          <div className="max-h-56 overflow-y-auto space-y-3">
            {Object.entries(grouped).map(([dateKey, dateEvents]) => {
              const today = isToday(dateKey)
              return (
                <div key={dateKey}>
                  <p className={`text-xs font-medium mb-1 ${today ? 'text-blue-600' : 'text-gray-500'}`}>
                    {formatDate(dateKey)}{today ? ' (Today)' : ''}
                  </p>
                  <div className="space-y-1">
                    {dateEvents.map((ev, i) => (
                      <div
                        key={`${dateKey}-${i}`}
                        className={`flex items-center gap-3 px-3 py-1.5 rounded text-xs border ${
                          today ? 'bg-blue-50 border-blue-100' : 'border-gray-100'
                        }`}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${IMPACT_DOT[ev.impact] || IMPACT_DOT.low}`} />
                        <span className="text-gray-400 w-12 shrink-0">{formatTime(ev.date)}</span>
                        <span className="font-medium text-gray-800 flex-1 truncate">{ev.event}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${IMPACT_STYLES[ev.impact] || IMPACT_STYLES.low}`}>
                          {ev.impact}
                        </span>
                        <span className="text-gray-500 w-16 text-right" title="Actual">
                          {formatValue(ev.actual)}
                        </span>
                        <span className="text-gray-400 w-16 text-right" title="Forecast">
                          {formatValue(ev.forecast)}
                        </span>
                        <span className="text-gray-400 w-16 text-right" title="Previous">
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
