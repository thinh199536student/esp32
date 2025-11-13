// /api/tts.js
export const config = {
  api: {
    bodyParser: false, // tắt bodyParser mặc định của Vercel để ESP32 gửi JSON thô
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // === Đọc dữ liệu thô từ ESP32 ===
    let rawBody = "";
    for await (const chunk of req) {
      rawBody += chunk;
    }

    console.log("📥 Raw body:", rawBody);

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch (err) {
      console.error("❌ JSON parse error:", err);
      return res.status(400).json({ error: "Invalid JSON", body: rawBody });
    }

    const text = data.text?.trim();
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    // === Dùng cùng API key với Gemini ===
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ Không tìm thấy GEMINI_API_KEY");
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // === Gọi Google Cloud Text-to-Speech ===
    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    const body = {
      input: { text },
      voice: { languageCode: "vi-VN", name: "vi-VN-Wavenet-A" },
      audioConfig: {
        audioEncoding: "LINEAR16",
        sampleRateHertz: 16000,
      },
    };

    const ttsResp = await fetch(ttsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await ttsResp.json();

    if (!ttsResp.ok || !json.audioContent) {
      console.error("❌ TTS API error:", json);
      return res.status(500).json({ error: "TTS API error", details: json });
    }

    // ✅ Trả về dữ liệu âm thanh base64 cho ESP32
    res.status(200).json({
      audioContent: json.audioContent,
    });
  } catch (err) {
    console.error("🔥 Handler error:", err);
    res.status(500).json({ error: err.message });
  }
}
