// api/upload.js
import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";

export const config = {
  api: { bodyParser: false },
};

// === Gemini API key ===
const GEMINI_API_KEY = "AIzaSyDQbbJiWNK_dBFV2GqinjBhckkVBjer6-8"; // 🔁 thay bằng key thật của bạn
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-robotics-er-1.5-preview:generateContent?key=${GEMINI_API_KEY}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const form = formidable({ multiples: false, uploadDir: "/tmp", keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Formidable error:", err);
      return res.status(500).json({ error: "Formidable parse error" });
    }

    try {
      const file = files.file?.[0] || files.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      console.log("✅ Received file:", file.originalFilename, "size:", file.size);

      // === Đọc & encode Base64 ===
      const fileData = fs.readFileSync(file.filepath).toString("base64");

      // === Gửi đến Gemini ===
      const geminiRes = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: "Hãy chuyển âm thanh tiếng Việt này thành văn bản, không tóm tắt:" },
                { inline_data: { mime_type: "audio/wav", data: fileData } }
              ]
            }
          ],
          generationConfig: { maxOutputTokens: 400 }
        }),
      });

      const geminiJson = await geminiRes.json();
      console.log("🎯 Gemini response:", geminiJson);

      // === Trả kết quả về cho ESP32 ===
      res.status(200).json({
        success: true,
        transcription: geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "(Không có kết quả)",
      });

    } catch (e) {
      console.error("🔥 Error:", e);
      res.status(500).json({ error: e.message });
    }
  });
}

