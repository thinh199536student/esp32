// /api/tts.js
export const config = {
  api: {
    bodyParser: false, // tắt bodyParser mặc định của Vercel
  },
};

export default async function handler(req, res) {
  try {
    // Đọc dữ liệu thô từ request
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers).toString();
    let data = {};
    try {
      data = JSON.parse(rawBody);
    } catch (err) {
      console.error("❌ Invalid JSON:", rawBody);
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const { text } = data;
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    const body = {
      input: { text },
      voice: { languageCode: "vi-VN", name: "vi-VN-Wavenet-A" },
      audioConfig: {
        audioEncoding: "LINEAR16",
        sampleRateHertz: 16000,
      },
    };

    const ttsResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await ttsResp.json();

    if (!json.audioContent) {
      console.error("Google TTS error:", json);
      return res.status(500).json({ error: "No audioContent", details: json });
    }

    res.status(200).json({ audioContent: json.audioContent });
  } catch (err) {
    console.error("Vercel /api/tts error:", err);
    res.status(500).json({ error: err.message });
  }
}
