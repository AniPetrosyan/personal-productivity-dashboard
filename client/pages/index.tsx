import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import CalendarEvents from '../components/CalendarEvents';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Home() {
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<{ text: string; completed: boolean; completedAt?: Date }[]>([]);
  const [newTask, setNewTask] = useState("");

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

  // Add a new task
  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, { text: newTask, completed: false }]);
      setNewTask("");
    }
  };

  // Mark a task as completed
  const completeTask = (idx: number) => {
    setTasks(tasks.map((task, i) =>
      i === idx ? { ...task, completed: true, completedAt: new Date() } : task
    ));
  };

  // Prepare data for chart
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow p-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-indigo-700">Personal Productivity Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 font-medium">AI Powered</span>
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

      <main className="flex-1 w-full max-w-5xl mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center items-stretch mb-8">
          {/* AI Summarizer */}
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
          {/* Calendar */}
          <section className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full w-full min-w-[300px] max-w-[350px]">
            <CalendarEvents />
          </section>
          {/* Tasks */}
          <section className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full w-full min-w-[300px] max-w-[350px]">
            <h2 className="text-lg font-bold mb-4 text-indigo-600">Tasks</h2>
            <div className="flex mb-4">
              <input
                className="flex-1 border border-indigo-200 rounded-l p-2 focus:ring-2 focus:ring-indigo-300"
                placeholder="Add a new task..."
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTask()}
              />
              <button
                className="bg-indigo-600 text-white px-6 py-2 rounded-r font-semibold hover:bg-indigo-700 transition-all"
                style={{ minWidth: "70px" }}
                onClick={addTask}
              >
                Add
              </button>
            </div>
            <ul className="space-y-2">
              {tasks.map((task, idx) => (
                <li key={idx} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => completeTask(idx)}
                    className="mr-2 accent-indigo-600"
                  />
                  <span className={task.completed ? "line-through text-gray-400" : "text-gray-800"}>{task.text}</span>
                </li>
              ))}
            </ul>
          </section>
          {/* Analytics */}
          {completedTasks.length > 0 && (
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
          {completedTasks.length === 0 && (
            <section className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full w-full min-w-[300px] lg:col-span-2 max-w-full items-center justify-center">
              <h2 className="text-lg font-bold mb-4 text-indigo-600">Productivity Analytics</h2>
              <p className="text-gray-500 text-center">Complete a task to see your productivity analytics!</p>
            </section>
          )}
          {/* AI Insight */}
          <section className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full w-full min-w-[300px] max-w-[350px]">
            <p className="mt-4 text-indigo-700 font-semibold">{aiInsight}</p>
          </section>
        </div>
      </main>
      <footer className="bg-white shadow-inner p-4 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} Ani. All rights reserved.
      </footer>
    </div>
  );
}