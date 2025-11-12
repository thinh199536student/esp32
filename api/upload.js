// api/upload.js
import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // Dùng Promise để đợi formidable xử lý xong
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable({ multiples: false });
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Lấy file từ ESP32
    const file = files.file?.[0] || files.file;
    if (!file) {
      return res.status(400).json({ error: "no file uploaded" });
    }

    const fileData = fs.readFileSync(file.filepath);
    console.log("✅ Received file:", file.originalFilename, "size:", file.size);

    // === Gọi API Gemini ===
    const GEMINI_API_KEY = "AIzaSyDQbbJiWNK_dBFV2GqinjBhckkVBjer6-8"; // <--- key của bạn ở đây
    const base64Audio = fileData.toString("base64");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-robotics-er-1.5-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: "Transcribe this Vietnamese audio to text:" },
                {
                  inline_data: {
                    mime_type: "audio/wav",
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 200 },
        }),
      }
    );

    const geminiJson = await geminiResponse.json();
    console.log("🧠 Gemini response:", geminiJson);

    return res.status(200).json({
      message: "✅ File received and sent to Gemini successfully!",
      result: geminiJson,
    });
  } catch (err) {
    console.error("🔥 Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}

