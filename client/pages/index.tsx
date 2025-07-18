import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import CalendarEvents from '../components/CalendarEvents';

export default function Home() {
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow p-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-indigo-700">Personal Productivity Dashboard</h1>
        <span className="text-gray-500 font-medium">AI Powered</span>
      </header>

      <main className="flex-1 flex flex-col md:flex-row gap-8 p-8 max-w-5xl mx-auto w-full">
        {/* AI Summarizer Card */}
        <section className="bg-white rounded-xl shadow-lg p-6 flex-1 flex flex-col">
          <h2 className="text-xl font-bold mb-2 text-indigo-600">AI Daily Task Summarizer</h2>
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

        {/* Calendar Card */}
        <section className="bg-white rounded-xl shadow-lg p-6 w-full md:w-80 flex flex-col">
          <CalendarEvents />
        </section>
      </main>
      <footer className="bg-white shadow-inner p-4 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} Ani. All rights reserved.
      </footer>
      {!session ? (
        <div className="flex justify-center my-4">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            onClick={() => signIn("google")}
          >
            Sign in with Google
          </button>
        </div>
      ) : (
        <div className="flex justify-end my-4">
          <span className="mr-2 text-gray-700">Signed in as {session.user?.email}</span>
          <button
            className="bg-gray-300 text-gray-800 px-3 py-1 rounded hover:bg-gray-400 transition"
            onClick={() => signOut()}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}