# Personal Productivity Dashboard

A comprehensive productivity dashboard with AI-powered features, task management, and Google Calendar integration.

## Features

- **Task Management**: Create, categorize, and track tasks with due dates and notes
- **AI Summarizer**: Get AI-powered summaries of your daily tasks and notes
- **Google Calendar Integration**: View and analyze your calendar events
- **Productivity Analytics**: Detailed insights into how you spend your time
- **Motivational Quotes**: Daily inspiration to boost productivity
- **Customizable Dashboard**: Show/hide widgets based on your preferences
- **Multiple Themes**: Choose from different visual themes

## Google Calendar Integration

The dashboard integrates with Google Calendar to provide:
- Real-time calendar events display
- Time distribution analysis across different activities
- Productivity insights based on your schedule
- AI-powered break suggestions

### Setup Instructions

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Calendar API

2. **Configure OAuth 2.0**:
   - Go to "APIs & Services" > "Credentials"
   - Create an OAuth 2.0 Client ID
   - Add your domain to authorized origins
   - Add your callback URL: `http://localhost:3000/api/auth/callback/google`

3. **Environment Variables**:
   Create a `.env.local` file in the client directory:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

4. **Calendar Permissions**:
   - When users sign in, they'll be prompted to grant calendar access
   - The app requests read-only access to their primary calendar
   - Users can revoke access at any time through their Google Account settings

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (see above)

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Routes

- `/api/auth/[...nextauth]` - NextAuth.js configuration for Google OAuth
- `/api/calendar` - Google Calendar integration
- `/api/quotes` - Motivational quotes API
- `/api/summarize` - AI summarization (requires backend server)

## Technologies Used

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with Google OAuth
- **Charts**: Recharts for data visualization
- **Calendar**: Google Calendar API
- **Icons**: Lucide React

## Privacy & Security

- All calendar data is processed locally in your browser
- No calendar data is stored on our servers
- Users maintain full control over their data and can revoke access anytime
- The app only requests read-only access to calendars

