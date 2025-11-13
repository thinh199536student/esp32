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

    // === support both GEMINI_API_KEY và GOOGLE_API_KEY ===
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("❌ Thiếu API key (GEMINI_API_KEY or GOOGLE_API_KEY)");
      return res.status(500).json({ error: "Missing API key" });
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

    // đọc raw text để debug nếu response không phải JSON
    const respText = await response.text();
    let json;
    try {
      json = JSON.parse(respText);
    } catch (parseErr) {
      console.error("❌ Không parse được JSON từ Google TTS. HTTP status:", response.status);
      console.error("❌ Response body:", respText);
      return res.status(500).json({
        error: "Invalid JSON from Google TTS",
        status: response.status,
        body: respText,
      });
    }

    if (!response.ok) {
      console.error("❌ Lỗi từ Google TTS:", json);
      return res.status(response.status).json({
        error: "TTS API error",
        details: json,
      });
    }

    if (!json.audioContent) {
      console.error("❌ Không có audioContent trong phản hồi Google TTS:", json);
      return res.status(500).json({
        error: "Missing audioContent in TTS response",
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
// ...existing code...
