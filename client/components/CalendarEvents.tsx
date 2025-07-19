import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface CalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
}

export default function CalendarEvents() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;
    setLoading(true);
    fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=" + new Date().toISOString(), {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        // Only show upcoming events, limit to 10
        const upcoming = (data.items || [])
          .filter((event: CalendarEvent) => event.start?.dateTime || event.start?.date)
          .slice(0, 10);
        setEvents(upcoming);
        setLoading(false);
      });
  }, [session]);

  if (!session) return <div>Please sign in to view your calendar.</div>;
  if (loading) return <div>Loading events...</div>;
  if (!events.length) return <div>No upcoming events found.</div>;

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
