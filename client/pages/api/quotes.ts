import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch('https://zenquotes.io/api/quotes');
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch quotes' });
    }
    const data = await response.json();
    const quotes = data.map((q: any) => ({ text: q.q, author: q.a }));
    res.status(200).json(quotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
} 