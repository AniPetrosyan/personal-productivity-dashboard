import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface CalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
}

interface CalendarEventsProps {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
}

export default function CalendarEvents({ events, setEvents }: CalendarEventsProps) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  // Only fetch if authenticated
  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/calendar")
      .then(res => {
        if (!res.ok) {
          setEvents([]);
          setLoading(false);
          return;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          const upcoming = data
            .filter(event => event.start?.dateTime || event.start?.date)
            .slice(0, 20);
          setEvents(upcoming);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching calendar events:", error);
        setEvents([]);
        setLoading(false);
      });
  }, [status, setEvents]);

  if (status === "loading") return <div className="text-gray-600">Loading events...</div>;
  if (status !== "authenticated") return null;
  if (loading) return <div className="text-gray-600">Loading events...</div>;
  if (!events.length) return <div className="text-gray-600">No upcoming events found. Make sure you've granted calendar access.</div>;

  // Group events by date
  const grouped: { [date: string]: CalendarEvent[] } = {};
  events.forEach(event => {
    const dateStr = event.start?.dateTime || event.start?.date || "";
    const date = dateStr ? new Date(dateStr).toLocaleDateString() : "Unknown Date";
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(event);
  });

  return (
    <div>
      <h2 className="text-lg font-bold mb-2 text-indigo-600 flex items-center gap-2">
        <span role="img" aria-label="calendar">📅</span> Upcoming Events
      </h2>
      <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "260px" }}>
        {Object.entries(grouped).map(([date, events]) => (
          <div key={date}>
            <div className="font-semibold text-indigo-700 mb-1">{date}</div>
            <ul className="space-y-2">
              {events.map(event => {
                const startStr = event.start?.dateTime || event.start?.date;
                const time = event.start?.dateTime
                  ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : "All Day";
                return (
                  <li key={event.id} className="flex items-start gap-2 p-2 bg-indigo-50 rounded border border-indigo-100">
                    <span className="mt-1" role="img" aria-label="event">🗓️</span>
                    <div>
                      <div className="font-medium text-gray-800">{event.summary || "(No Title)"}</div>
                      <div className="text-sm text-gray-600">{time}</div>
                      {event.location && <div className="text-xs text-gray-500">📍 {event.location}</div>}
                      {event.description && <div className="text-xs text-gray-500 mt-1">📝 {event.description}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
