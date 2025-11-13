// /api/tts.js
export const config = {
  api: {
    bodyParser: true, // bật lại parser JSON mặc định của Vercel
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'text'" });
    }

    console.log("📥 Nhận text:", text);

    // === Dùng chung GEMINI_API_KEY ===
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ Thiếu GEMINI_API_KEY");
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // === Gọi Google TTS API ===
    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    const payload = {
      input: { text },
      voice: { languageCode: "vi-VN", name: "vi-VN-Wavenet-A" },
      audioConfig: {
        audioEncoding: "LINEAR16",
        sampleRateHertz: 16000,
      },
    };

    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok || !json.audioContent) {
      console.error("❌ Lỗi từ Google TTS:", json);
      return res.status(500).json({
        error: "TTS API error",
        details: json,
      });
    }

    // ✅ Trả về audio base64 cho ESP32
    return res.status(200).json({
      audioContent: json.audioContent,
    });
  } catch (err) {
    console.error("🔥 Lỗi handler:", err);
    return res.status(500).json({ error: err.message });
  }
}
