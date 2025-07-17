import { useState } from "react";

export default function Home() {
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
      setSummary("Error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-4 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">AI Daily Task Summarizer</h1>
      <textarea
        className="w-full border rounded p-2 mb-2"
        rows={6}
        placeholder="Enter your tasks or notes for today..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handleSummarize}
        disabled={loading || !input.trim()}
      >
        {loading ? "Summarizing..." : "Summarize My Day"}
      </button>
      {summary && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">AI Summary:</h2>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}