import React, { useRef, useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import CalendarEvents from '../components/CalendarEvents';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

export default function Home() {
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<{ text: string; completed: boolean; completedAt?: Date; dueDate?: string; note?: string; category?: string }[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [theme, setTheme] = useState("default");
  const [streak, setStreak] = useState(0);
  const [noteModal, setNoteModal] = useState<{ open: boolean; idx: number | null; note: string }>({ open: false, idx: null, note: "" });
  // 1. Add categories
  const CATEGORIES = ["Work", "Personal", "Health", "Other"];
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  // 2. Add widget visibility state
  const [widgetVisibility, setWidgetVisibility] = useState({
    analytics: true,
    calendar: true,
    notes: true,
    aiSummarizer: true,
    aiInsight: true,
    aiBreak: true,
    quote: true,
  });
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    const days = new Set(
      tasks
        .filter(t => t.completed && t.completedAt)
        .map(t => new Date(t.completedAt!).toDateString())
    );
    let currentStreak = 0;
    let day = new Date();
    while (days.has(day.toDateString())) {
      currentStreak++;
      day.setDate(day.getDate() - 1);
    }
    setStreak(currentStreak);
  }, [tasks]);

  const completeTask = (idx: number) => {
    setTasks(tasks => tasks.map((task, i) => {
      if (i === idx && !task.completed) {
        return { ...task, completed: true, completedAt: new Date() };
      }
      return task;
    }));
  };

  // Restore handleSummarize
  const handleSummarize = async () => {
    setLoading(true);
    setSummary("");
    try {
      const res = await fetch("http://localhost:5001/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      setSummary(data.summary || "No summary returned.");
    } catch (err) {
      setSummary("Error: " + (err as Error).message);
    }
    setLoading(false);
  };

  // Restore addTask
  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, { text: newTask, completed: false, dueDate: newDueDate || undefined, note: '', category: newCategory }]);
      setNewTask("");
      setNewDueDate("");
      setNewCategory(CATEGORIES[0]);
    }
  };

  const completedTasks = tasks.filter(t => t.completed && t.completedAt);
  const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayCounts: { [day: string]: number } = {};
  dayAbbr.forEach(day => dayCounts[day] = 0);
  completedTasks.forEach(task => {
    const dayIdx = task.completedAt ? new Date(task.completedAt).getDay() : null;
    if (dayIdx !== null) dayCounts[dayAbbr[dayIdx]]++;
  });
  const chartData = dayAbbr.map(day => ({ day, count: dayCounts[day] }));
  const mostProductiveDay = chartData.reduce((max, curr) => curr.count > max.count ? curr : max, { day: "", count: 0 });
  const aiInsight = mostProductiveDay.count > 0
    ? `You're most productive on ${mostProductiveDay.day}s!`
    : "Complete some tasks to see your productivity insights.";

  function suggestBreakTime(events: any[]) {
    const today = new Date().toISOString().slice(0, 10);
    const todaysEvents = events
      .filter(event => {
        const start = event.start?.dateTime || event.start?.date;
        return start && start.startsWith(today);
      })
      .sort((a, b) => new Date(a.start.dateTime || a.start.date).getTime() - new Date(b.start.dateTime || b.start.date).getTime());
    if (todaysEvents.length === 0) {
      return "Suggested break: 12:00 PM - 12:30 PM";
    }
    const workStart = new Date(today + "T09:00:00");
    const workEnd = new Date(today + "T18:00:00");
    let lastEnd = workStart;
    let bestGap = { start: null, end: null, duration: 0 };
    for (const event of todaysEvents) {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const gap = (eventStart.getTime() - lastEnd.getTime()) / (1000 * 60);
      if (gap >= 20 && gap > bestGap.duration) {
        bestGap = { start: new Date(lastEnd), end: new Date(eventStart), duration: gap };
      }
      lastEnd = new Date(event.end?.dateTime || event.end?.date || eventStart);
    }
    const endGap = (workEnd.getTime() - lastEnd.getTime()) / (1000 * 60);
    if (endGap >= 20 && endGap > bestGap.duration) {
      bestGap = { start: new Date(lastEnd), end: new Date(workEnd), duration: endGap };
    }
    if (bestGap.start && bestGap.end) {
      return `Suggested break: ${bestGap.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${bestGap.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return "No optimal break found in your schedule today. Try to take a break between meetings!";
    }
  }

  const openNoteModal = (idx: number) => {
    setNoteModal({ open: true, idx, note: tasks[idx].note || "" });
  };
  const closeNoteModal = () => {
    setNoteModal({ open: false, idx: null, note: "" });
  };
  const saveNote = () => {
    if (noteModal.idx !== null) {
      setTasks(tasks => tasks.map((task, i) => i === noteModal.idx ? { ...task, note: noteModal.note } : task));
    }
    closeNoteModal();
  };

  // Filtered tasks by category
  const filteredTasks = categoryFilter ? tasks.filter(t => t.category === categoryFilter) : tasks;

  // Motivational quotes from API
  const [quotes, setQuotes] = useState<{ text: string; author: string | null }[]>([]);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  useEffect(() => {
    setQuotesLoading(true);
    fetch('/api/quotes')
      .then(res => res.json())
      .then((data) => {
        setQuotes(data);
        setQuoteIdx(Math.floor(Math.random() * data.length));
        setQuotesLoading(false);
      })
      .catch(() => {
        setQuotesError('Could not load quotes.');
        setQuotesLoading(false);
      });
  }, []);
  const newQuote = () => {
    if (!quotes.length) return;
    let idx;
    do {
      idx = Math.floor(Math.random() * quotes.length);
    } while (idx === quoteIdx && quotes.length > 1);
    setQuoteIdx(idx);
  };

  return (
    <div className={
      `min-h-screen flex flex-col ` +
      (theme === "default" ? "bg-gradient-to-br from-blue-50 to-indigo-100" : "") +
      (theme === "focus" ? "bg-gradient-to-br from-gray-800 to-gray-600" : "") +
      (theme === "sunset" ? "bg-gradient-to-br from-pink-200 via-yellow-100 to-orange-200" : "") +
      (theme === "ocean" ? "bg-gradient-to-br from-blue-200 via-cyan-100 to-blue-400" : "")
    }>
      {/* @ts-ignore */}
      <header className="bg-white shadow p-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-indigo-700">Personal Productivity Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 font-medium">AI Powered</span>
          {/* Theme Switcher */}
          <select
            className="border rounded px-2 py-1 text-sm"
            value={theme}
            onChange={e => setTheme(e.target.value)}
          >
            <option value="default">Default</option>
            <option value="focus">Focus Mode</option>
            <option value="sunset">Sunset</option>
            <option value="ocean">Ocean</option>
          </select>
          {!session ? (
            <button
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
              onClick={() => signIn("google")}
            >
              Sign in with Google
            </button>
          ) : (
            <>
              <span className="mr-2 text-gray-700">Signed in as {session.user?.email}</span>
              <button
                className="bg-gray-300 text-gray-800 px-3 py-1 rounded hover:bg-gray-400 transition"
                onClick={() => signOut()}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </header>
      {streak > 0 && (
        <div className="flex justify-center mt-4">
          <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold text-lg flex items-center gap-2 shadow">
            <span role="img" aria-label="fire">🔥</span> Streak: {streak} day{streak > 1 ? "s" : ""}!
          </span>
        </div>
      )}
      <main className="flex-1 w-full max-w-5xl mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center items-stretch mb-8">
          {/* AI Summarizer */}
          {widgetVisibility.aiSummarizer && (
            <section className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full w-full min-w-[300px] max-w-[350px]">
              <h2 className="text-lg font-bold mb-4 text-indigo-600">AI Daily Task Summarizer</h2>
              <textarea
                className="w-full border border-indigo-200 rounded p-2 mb-2 focus:ring-2 focus:ring-indigo-300"
                rows={6}
                placeholder="Enter your tasks or notes for today..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition mb-2"
                onClick={handleSummarize}
                disabled={loading || !input.trim()}
              >
                {loading ? "Summarizing..." : "Summarize My Day"}
              </button>
              {summary && (
                <div className="mt-4 p-3 bg-indigo-50 rounded border border-indigo-100">
                  <h3 className="font-semibold mb-2 text-indigo-700">AI Summary:</h3>
                  <p className="text-gray-700 whitespace-pre-line">{summary}</p>
                </div>
              )}
            </section>
          )}
          {/* Calendar */}
          {widgetVisibility.calendar && (
            <section className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full w-full min-w-[300px] max-w-[350px]">
              <CalendarEvents events={calendarEvents} setEvents={setCalendarEvents} />
            </section>
          )}
          {/* Tasks */}
          {widgetVisibility.notes && (
            <section className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full w-full min-w-[300px] max-w-[350px]">
              <h2 className="text-lg font-bold mb-4 text-indigo-600">Tasks</h2>
              <form
                className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_min-content_auto] mb-4 w-full"
                onSubmit={e => { e.preventDefault(); addTask(); }}
              >
                <input
                  className="border border-indigo-200 rounded p-2 focus:ring-2 focus:ring-indigo-300 w-full"
                  placeholder="Add a new task..."
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                />
                <input
                  type="date"
                  className="border border-indigo-200 rounded p-2 focus:ring-2 focus:ring-indigo-300 w-10 min-w-[40px] text-transparent cursor-pointer"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  placeholder=" "
                  style={{ color: 'transparent' }}
                  onFocus={e => (e.target.style.color = 'black')}
                  onBlur={e => (e.target.style.color = 'transparent')}
                />
                <select
                  className="border border-indigo-200 rounded p-2 focus:ring-2 focus:ring-indigo-300"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-2 rounded font-semibold hover:bg-indigo-700 transition-all w-full"
                >
                  Add
                </button>
              </form>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  className={
                    "px-2 py-0.5 rounded text-sm " +
                    (!categoryFilter ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700")
                  }
                  onClick={() => setCategoryFilter(null)}
                >
                  All
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={
                      "px-2 py-0.5 rounded text-sm " +
                      (categoryFilter === cat ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700")
                    }
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <ul className="space-y-2">
                {filteredTasks.map((task, idx) => {
                  const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
                  return (
                    <li key={idx} className="flex flex-col items-start">
                      <div className="flex items-center w-full">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => completeTask(idx)}
                          className="mr-2 accent-indigo-600"
                        />
                        <span className={task.completed ? "line-through text-gray-400" : isOverdue ? "text-red-600 font-semibold" : "text-gray-800"}>
                          {task.text}
                          {task.dueDate && (
                            <span className={task.completed ? "ml-2 text-xs font-normal italic line-through" : "ml-2 text-xs font-normal italic"}>(Due: {task.dueDate})</span>
                          )}
                          {task.category && (
                            <span className="ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">{task.category}</span>
                          )}
                        </span>
                        <button
                          className="ml-2 text-indigo-500 hover:text-indigo-700 focus:outline-none"
                          title={task.note ? "View/Edit Note" : "Add Note"}
                          onClick={() => openNoteModal(idx)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a2.25 2.25 0 11-3.18-3.18l5.66-5.66a2.25 2.25 0 113.18 3.18l-5.66 5.66z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25l-9.19 9.19a2.25 2.25 0 01-3.18-3.18l9.19-9.19" />
                          </svg>
                        </button>
                      </div>
                      {task.note && (
                        <div className="ml-7 mt-1 text-xs italic text-gray-500 bg-gray-50 rounded px-2 py-1 w-full">
                          {typeof task.note === 'string' ? task.note : ''}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {/* Analytics */}
          {widgetVisibility.analytics && completedTasks.length > 0 && (
            <section className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full w-full min-w-[300px] lg:col-span-2 max-w-full">
              <h2 className="text-lg font-bold mb-4 text-indigo-600">Productivity Analytics</h2>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="95%" height={350}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                    barCategoryGap="30%"
                  >
                    <XAxis dataKey="day" tick={{ fontSize: 14 }} interval={0} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
          {widgetVisibility.analytics && completedTasks.length === 0 && (
            <section className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full w-full min-w-[300px] lg:col-span-2 max-w-full items-center justify-center">
              <h2 className="text-lg font-bold mb-4 text-indigo-600">Productivity Analytics</h2>
              <p className="text-gray-500 text-center">Complete a task to see your productivity analytics!</p>
            </section>
          )}
          {/* AI Insight */}
          {widgetVisibility.aiInsight && (
            <section className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full w-full min-w-[300px] max-w-[350px]">
              <p className="mt-4 text-indigo-700 font-semibold">{aiInsight}</p>
            </section>
          )}
          {/* AI Break Suggestion */}
          {widgetVisibility.aiBreak && (
            <section className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full w-full min-w-[300px] max-w-[350px]">
              <h2 className="text-lg font-bold mb-4 text-indigo-600">AI Break Suggestion</h2>
              <p className="text-gray-700">
                {suggestBreakTime(calendarEvents)}
              </p>
            </section>
          )}
          {/* Motivational Quote */}
          {widgetVisibility.quote && (
            <section className="bg-gradient-to-br from-pink-100 via-indigo-50 to-blue-100 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center w-full min-w-[300px] max-w-[500px] mx-auto mb-8 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl" role="img" aria-label="sparkle">✨</span>
                <span className="text-lg font-semibold text-indigo-700">Mental Health Boost</span>
              </div>
              {quotesLoading ? (
                <div className="italic text-gray-400 mb-2">Loading quote...</div>
              ) : quotesError ? (
                <div className="italic text-red-400 mb-2">{quotesError}</div>
              ) : quotes.length > 0 ? (
                <>
                  <blockquote className="italic text-center text-lg text-gray-700 mb-2 max-w-xs">“{quotes[quoteIdx].text}”</blockquote>
                  <div className="text-sm text-indigo-500 mb-3">— {quotes[quoteIdx].author || 'Unknown'}</div>
                  <button
                    className="px-4 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium hover:bg-indigo-200 transition text-sm shadow"
                    onClick={newQuote}
                  >
                    New Quote
                  </button>
                </>
              ) : (
                <div className="italic text-gray-400 mb-2">No quotes available.</div>
              )}
            </section>
          )}
        </div>
        <div className="flex justify-end mb-4">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-full shadow-sm hover:bg-indigo-50 hover:text-indigo-900 transition font-semibold"
            onClick={() => setCustomizeOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 2.25c.414 0 .75.336.75.75v1.086a7.5 7.5 0 013.553 1.474l.77-.77a.75.75 0 111.06 1.06l-.77.77A7.5 7.5 0 0120.164 12h1.086a.75.75 0 010 1.5h-1.086a7.5 7.5 0 01-1.474 3.553l.77.77a.75.75 0 11-1.06 1.06l-.77-.77A7.5 7.5 0 0112 20.164v1.086a.75.75 0 01-1.5 0v-1.086a7.5 7.5 0 01-3.553-1.474l-.77.77a.75.75 0 11-1.06-1.06l.77-.77A7.5 7.5 0 013.836 13.5H2.75a.75.75 0 010-1.5h1.086a7.5 7.5 0 011.474-3.553l-.77-.77a.75.75 0 111.06-1.06l.77.77A7.5 7.5 0 0112 3.836V2.75c0-.414.336-.75.75-.75zM12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
            </svg>
            Customize Dashboard
          </button>
        </div>
        {customizeOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4 text-indigo-700">Customize Dashboard</h3>
              <div className="flex flex-col gap-2 mb-4">
                {Object.entries(widgetVisibility).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => setWidgetVisibility(v => ({ ...v, [key]: !v[key as keyof typeof v] }))}
                    />
                    {key === 'analytics' && 'Productivity Analytics'}
                    {key === 'calendar' && 'Calendar'}
                    {key === 'notes' && 'Tasks'}
                    {key === 'aiSummarizer' && 'AI Summarizer'}
                    {key === 'aiInsight' && 'AI Insight'}
                    {key === 'aiBreak' && 'AI Break Suggestion'}
                    {key === 'quote' && 'Motivational Quote'}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setCustomizeOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="bg-white shadow-inner p-4 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} Ani. All rights reserved.
      </footer>
      {/* Note Modal */}
      {noteModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2 text-indigo-700">Task Note</h3>
            <textarea
              className="w-full border border-indigo-200 rounded p-2 mb-4 focus:ring-2 focus:ring-indigo-300"
              rows={4}
              value={noteModal.note}
              onChange={e => setNoteModal(modal => ({ ...modal, note: e.target.value }))}
              placeholder="Add a note or description for this task..."
            />
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={closeNoteModal}>Cancel</button>
              <button className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={saveNote}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}