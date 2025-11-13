// /api/tts.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { text } = await req.json();
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_API_KEY) return res.status(500).json({ error: "Missing GOOGLE_API_KEY" });

  const ttsResp = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "vi-VN", name: "vi-VN-Standard-A" },
        audioConfig: { audioEncoding: "LINEAR16" }
      })
    }
  );

  const ttsData = await ttsResp.json();
  res.status(200).json(ttsData);
}
