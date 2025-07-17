import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

interface OpenAIResponse {
  choices?: { message?: { content?: string } }[];
}

const app = express();
const PORT = process.env.PORT || 5001;

// Use only ONE of the following CORS setups:

// 1. Allow all origins (for local dev, safest for now):
app.use(cors());

// 2. Or, restrict to your frontend (uncomment if you want to restrict):
// app.use(cors({
//   origin: "http://localhost:3000",
//   methods: ["POST", "GET", "OPTIONS"],
//   credentials: true
// }));

app.use(express.json());

app.post('/api/summarize', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant that summarizes and prioritizes daily tasks." },
          { role: "user", content: text }
        ],
        max_tokens: 150,
      }),
    });
    const openaiData = await openaiRes.json() as OpenAIResponse;
    const summary = openaiData.choices?.[0]?.message?.content?.trim() || "No summary generated.";
    res.json({ summary });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to summarize: " + errorMessage });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));