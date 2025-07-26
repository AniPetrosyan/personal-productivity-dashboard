import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Calendar, Clock, TrendingUp, Target, Users, Briefcase, Heart, BookOpen } from "lucide-react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  colorId?: string;
  description?: string;
}

interface TimeAnalysis {
  category: string;
  hours: number;
  percentage: number;
  color: string;
  events: number;
}

interface WeeklyData {
  week: string;
  workHours: number;
  personalHours: number;
  meetings: number;
  productivity: number;
}

export default function Analytics() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [timeAnalysis, setTimeAnalysis] = useState<TimeAnalysis[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("week"); // week, month, quarter
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [productivityScore, setProductivityScore] = useState(0);
  const [insights, setInsights] = useState<string[]>([]);

  // Category keywords for automatic categorization
  const categoryKeywords = {
    "Work": ["meeting", "work", "project", "client", "business", "office", "workout", "exercise", "gym", "fitness", "health"],
    "Personal": ["personal", "family", "friend", "social", "dinner", "lunch", "coffee", "date"],
    "Health": ["workout", "exercise", "gym", "fitness", "health", "doctor", "medical", "therapy"],
    "Learning": ["study", "course", "learning", "training", "workshop", "seminar", "conference", "reading"],
    "Meetings": ["meeting", "call", "conference", "standup", "review", "sync"],
    "Break": ["break", "lunch", "dinner", "coffee", "rest", "pause"]
  };

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16", "#F97316"];

  useEffect(() => {
    if (session) {
      fetchCalendarEvents();
    }
  }, [session, dateRange]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/calendar');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in with Google to access your calendar');
        }
        throw new Error('Failed to fetch calendar events');
      }
      const events = await response.json();
      
      setEvents(events);
      analyzeTimeDistribution(events);
      generateWeeklyData(events);
      generateInsights(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      setEvents([]);
      setTimeAnalysis([]);
      setWeeklyData([]);
      setInsights(['Please sign in with Google to view your calendar analytics.']);
    }
    setLoading(false);
  };

  const analyzeTimeDistribution = (events: CalendarEvent[]) => {
    const categoryHours: { [key: string]: number } = {};
    const categoryEvents: { [key: string]: number } = {};

    events.forEach(event => {
      const start = new Date(event.start.dateTime || event.start.date || "");
      const end = new Date(event.end?.dateTime || event.end?.date || "");
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours

      const category = categorizeEvent(event.summary);
      categoryHours[category] = (categoryHours[category] || 0) + duration;
      categoryEvents[category] = (categoryEvents[category] || 0) + 1;
    });

    const totalHours = Object.values(categoryHours).reduce((sum, hours) => sum + hours, 0);
    
    const analysis: TimeAnalysis[] = Object.entries(categoryHours).map(([category, hours], index) => ({
      category,
      hours: Math.round(hours * 100) / 100,
      percentage: Math.round((hours / totalHours) * 100),
      color: COLORS[index % COLORS.length],
      events: categoryEvents[category]
    }));

    setTimeAnalysis(analysis.sort((a, b) => b.hours - a.hours));
  };

  const categorizeEvent = (summary: string): string => {
    const lowerSummary = summary.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerSummary.includes(keyword))) {
        return category;
      }
    }
    return "Other";
  };

  const generateWeeklyData = (events: CalendarEvent[]) => {
    // Generate weekly data from real calendar events for the past 8 weeks
    const weeklyData: WeeklyData[] = [];
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      // Filter events for this week
      const weekEvents = events.filter(event => {
        const eventStart = new Date(event.start.dateTime || event.start.date || "");
        return eventStart >= weekStart && eventStart < weekEnd;
      });
      
      // Calculate hours for each category
      let workHours = 0;
      let personalHours = 0;
      let meetingHours = 0;
      
      weekEvents.forEach(event => {
        const start = new Date(event.start.dateTime || event.start.date || "");
        const end = new Date(event.end?.dateTime || event.end?.date || start);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
        
        const category = categorizeEvent(event.summary);
        if (category === "Work") workHours += duration;
        else if (category === "Personal") personalHours += duration;
        else if (category === "Meetings") meetingHours += duration;
      });
      
      // Calculate productivity score for this week
      const totalHours = workHours + personalHours + meetingHours;
      const productivity = totalHours > 0 ? Math.min(100, (workHours / totalHours) * 100) : 0;
      
      weeklyData.push({
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        workHours: Math.round(workHours * 100) / 100,
        personalHours: Math.round(personalHours * 100) / 100,
        meetings: Math.round(meetingHours * 100) / 100,
        productivity: Math.round(productivity)
      });
    }
    
    setWeeklyData(weeklyData);
  };

  const findScheduleGaps = (events: CalendarEvent[]): any[] => {
    // Find gaps in the schedule (time periods with no events)
    const gaps: any[] = [];
    const sortedEvents = events
      .filter(event => event.start.dateTime) // Only events with specific times
      .sort((a, b) => new Date(a.start.dateTime!).getTime() - new Date(b.start.dateTime!).getTime());
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEnd = new Date(sortedEvents[i].end?.dateTime || sortedEvents[i].start.dateTime!);
      const nextStart = new Date(sortedEvents[i + 1].start.dateTime!);
      const gap = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60); // hours
      
      if (gap > 1) { // Gap larger than 1 hour
        gaps.push({
          start: currentEnd,
          end: nextStart,
          duration: gap
        });
      }
    }
    
    return gaps;
  };

  const generateInsights = (events: CalendarEvent[]) => {
    const insights: string[] = [];
    
    if (events.length === 0) {
      insights.push("No calendar events found. Add some events to get personalized insights.");
      setInsights(insights);
      return;
    }
    
    // Analyze meeting patterns
    const meetings = events.filter(e => categorizeEvent(e.summary) === "Meetings");
    const meetingHours = meetings.reduce((total, event) => {
      const start = new Date(event.start.dateTime || event.start.date || "");
      const end = new Date(event.end?.dateTime || event.end?.date || start);
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);
    
    if (meetings.length > 5) {
      insights.push(`You have ${meetings.length} meetings scheduled. Consider blocking focus time between meetings.`);
    }
    
    if (meetingHours > 20) {
      insights.push(`You're spending ${Math.round(meetingHours)} hours in meetings. Consider if all meetings are necessary.`);
    }

    // Analyze work-life balance
    const workHours = timeAnalysis.find(t => t.category === "Work")?.hours || 0;
    const personalHours = timeAnalysis.find(t => t.category === "Personal")?.hours || 0;
    const healthHours = timeAnalysis.find(t => t.category === "Health")?.hours || 0;
    
    if (workHours > 0 && personalHours === 0) {
      insights.push("No personal time scheduled. Consider adding breaks and personal activities.");
    } else if (workHours > personalHours * 4) {
      insights.push("Work hours significantly outweigh personal time. Try to balance your schedule better.");
    }
    
    if (healthHours === 0) {
      insights.push("No health activities scheduled. Consider adding exercise or wellness time.");
    }

    // Analyze productivity patterns
    const mostProductiveTime = findMostProductiveTime(events);
    if (mostProductiveTime) {
      insights.push(`Most scheduled activities are during ${mostProductiveTime}. This might be your peak productivity time.`);
    }

    // Analyze schedule gaps
    const gaps = findScheduleGaps(events);
    if (gaps.length > 0) {
      insights.push(`You have ${gaps.length} time gaps in your schedule. Consider using these for focused work.`);
    }

    // Analyze event distribution
    const totalHours = timeAnalysis.reduce((sum, t) => sum + t.hours, 0);
    if (totalHours > 0) {
      const workPercentage = (workHours / totalHours) * 100;
      if (workPercentage > 80) {
        insights.push("Over 80% of your time is work-related. Consider adding more variety to your schedule.");
      }
    }

    setInsights(insights);
  };

  const findMostProductiveTime = (events: CalendarEvent[]): string | null => {
    // Simple algorithm to find most productive time
    const hourCounts: { [key: number]: number } = {};
    
    events.forEach(event => {
      const start = new Date(event.start.dateTime || event.start.date || "");
      const hour = start.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const mostProductiveHour = Object.entries(hourCounts).reduce((max, [hour, count]) => 
      count > max.count ? { hour: parseInt(hour), count } : max, { hour: 0, count: 0 }
    );

    if (mostProductiveHour.count > 0) {
      return `${mostProductiveHour.hour}:00`;
    }
    return null;
  };

  const calculateProductivityScore = () => {
    // Calculate productivity score based on various factors
    const workHours = timeAnalysis.find(t => t.category === "Work")?.hours || 0;
    const meetings = timeAnalysis.find(t => t.category === "Meetings")?.hours || 0;
    const learning = timeAnalysis.find(t => t.category === "Learning")?.hours || 0;
    
    let score = 0;
    if (workHours >= 30 && workHours <= 50) score += 30; // Optimal work hours
    if (meetings <= workHours * 0.3) score += 25; // Not too many meetings
    if (learning >= 5) score += 20; // Learning time
    if (timeAnalysis.find(t => t.category === "Health")) score += 15; // Health activities
    if (timeAnalysis.find(t => t.category === "Personal")) score += 10; // Personal time
    
    setProductivityScore(Math.min(score, 100));
  };

  useEffect(() => {
    calculateProductivityScore();
  }, [timeAnalysis]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please sign in to view analytics</h1>
          <p className="text-gray-600">Your calendar data will be analyzed to provide insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-3xl font-extrabold text-indigo-700">Calendar Analytics</h1>
            <nav className="flex items-center gap-4">
              <a href="/" className="text-gray-600 hover:text-indigo-600 font-medium">Dashboard</a>
              <a href="/analytics" className="text-indigo-600 hover:text-indigo-800 font-medium">Analytics</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <select
              className="border rounded px-3 py-1 text-sm"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing your calendar...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Productivity Score */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-indigo-700">Productivity Score</h2>
                <Target className="text-indigo-600" size={24} />
              </div>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - productivityScore / 100)}`}
                      className="text-indigo-600 transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-indigo-700">{productivityScore}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Your Performance</h3>
                  <p className="text-gray-600 text-sm">
                    {productivityScore >= 80 ? "Excellent! You're maintaining great work-life balance." :
                     productivityScore >= 60 ? "Good progress! Consider optimizing your schedule." :
                     "Room for improvement. Focus on time management and breaks."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Time Distribution Pie Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-indigo-700">Time Distribution</h2>
                  <Clock className="text-indigo-600" size={24} />
                </div>
                {timeAnalysis.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={timeAnalysis}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percentage }) => `${category} ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="hours"
                      >
                        {timeAnalysis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <p className="text-gray-500 mb-2">No time distribution data</p>
                      <p className="text-sm text-gray-400">Add calendar events to see how you spend your time</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Weekly Trends */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-indigo-700">Weekly Trends</h2>
                  <TrendingUp className="text-indigo-600" size={24} />
                </div>
                {weeklyData.length > 0 && weeklyData.some(week => week.workHours > 0 || week.personalHours > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weeklyData}>
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="workHours" stroke="#3B82F6" strokeWidth={2} name="Work Hours" />
                      <Line type="monotone" dataKey="personalHours" stroke="#10B981" strokeWidth={2} name="Personal Hours" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <p className="text-gray-500 mb-2">No weekly data available</p>
                      <p className="text-sm text-gray-400">Add calendar events to see your weekly trends</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Category Breakdown */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-indigo-700 mb-4">Category Breakdown</h3>
                <div className="space-y-3">
                  {timeAnalysis.map((category) => (
                    <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{category.hours}h</div>
                        <div className="text-sm text-gray-500">{category.events} events</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-indigo-700 mb-4">AI Insights</h3>
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <div key={index} className="p-3 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-indigo-800">{insight}</p>
                    </div>
                  ))}
                  {insights.length === 0 && (
                    <p className="text-gray-500 text-sm">Complete more activities to get personalized insights.</p>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-indigo-700 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="text-blue-600" size={20} />
                      <span className="text-sm">Total Events</span>
                    </div>
                    <span className="font-semibold">{events.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="text-green-600" size={20} />
                      <span className="text-sm">Total Hours</span>
                    </div>
                    <span className="font-semibold">
                      {timeAnalysis.reduce((sum, t) => sum + t.hours, 0).toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="text-purple-600" size={20} />
                      <span className="text-sm">Meetings</span>
                    </div>
                    <span className="font-semibold">
                      {timeAnalysis.find(t => t.category === "Meetings")?.events || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="text-orange-600" size={20} />
                      <span className="text-sm">Learning</span>
                    </div>
                    <span className="font-semibold">
                      {timeAnalysis.find(t => t.category === "Learning")?.hours || 0}h
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-indigo-700 mb-4">Recent Calendar Events</h3>
              <div className="space-y-3">
                {events.slice(0, 10).map((event) => {
                  const start = new Date(event.start.dateTime || event.start.date || "");
                  const end = new Date(event.end?.dateTime || event.end?.date || "");
                  const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                  const category = categorizeEvent(event.summary);
                  
                  return (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[Object.keys(categoryKeywords).indexOf(category) % COLORS.length] }}
                        ></div>
                        <div>
                          <div className="font-medium">{event.summary}</div>
                          <div className="text-sm text-gray-500">
                            {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{duration.toFixed(1)}h</div>
                        <div className="text-sm text-gray-500">{category}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
} 