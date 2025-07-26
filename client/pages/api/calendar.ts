import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  colorId?: string;
  description?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user session to access their Google Calendar
    const session = await getSession({ req });
    
    if (!session?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated or no access token' });
    }

    // Calculate date range for the request (last 30 days to next 30 days)
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch events from Google Calendar API
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!calendarResponse.ok) {
      console.error('Google Calendar API error:', await calendarResponse.text());
      return res.status(calendarResponse.status).json({ 
        error: 'Failed to fetch calendar events from Google' 
      });
    }

    const calendarData = await calendarResponse.json();
    
    // Transform Google Calendar events to our format
    const events: CalendarEvent[] = calendarData.items?.map((event: any) => ({
      id: event.id,
      summary: event.summary || 'No Title',
      start: event.start,
      end: event.end,
      colorId: event.colorId,
      description: event.description
    })) || [];

    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
} 