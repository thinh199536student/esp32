// /api/tts.js
export default async function handler(req, res) {
  try {
    // Đọc text từ ESP32 gửi lên
    const { text } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    // Lấy Google API key (dùng chung với Gemini)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in environment" });
    }

    // Endpoint Google Text-to-Speech
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    // Cấu hình yêu cầu
    const body = {
      input: { text },
      voice: { languageCode: "vi-VN", name: "vi-VN-Wavenet-A" },
      audioConfig: {
        audioEncoding: "LINEAR16",      // ESP32 hiểu định dạng này
        sampleRateHertz: 16000          // khớp với SAMPLE_RATE trên ESP32
      }
    };

    // Gửi yêu cầu đến Google TTS
    const ttsResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await ttsResp.json();

    // Kiểm tra phản hồi từ Google
    if (!data.audioContent) {
      console.error("Google TTS error:", data);
      return res.status(500).json({
        error: "Google TTS did not return audioContent",
        details: data,
      });
    }

    // Trả dữ liệu base64 lại cho ESP32
    res.status(200).json({ audioContent: data.audioContent });
  } catch (err) {
    console.error("Vercel /api/tts error:", err);
    res.status(500).json({ error: err.message });
  }
}
