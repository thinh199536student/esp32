// api/upload.js
import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";
import path from 'path';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // ⚙️ Parse multipart form
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      uploadDir: "/tmp",
    });

    const [fields, files] = await form.parse(req);
    const file = files.file;
    if (!file) return res.status(400).json({ error: "Không có file nào được tải lên" });

    const uploadedFile = Array.isArray(file) ? file[0] : file;
    const filePath = uploadedFile.filepath || uploadedFile.path;
    const fileName = uploadedFile.originalFilename || "unknown.wav";

    if (fileName !== "rec.wav") {
      return res.status(400).json({ error: "Sai tên file, cần là rec.wav" });
    }

    const stats = fs.statSync(filePath);
    const size = stats.size;
    console.log("✅ Nhận file:", fileName, "size:", size, "bytes");

    // === 🔑 API KEY GEMINI (đặt trực tiếp trong code) ===
    const GEMINI_API_KEY = "AIzaSyDQbbJiWNK_dBFV2GqinjBhckkVBjer6-8"; // <-- Thay bằng key thật của bạn

    // === 📦 Encode file thành base64 ===
    const audioBuffer = fs.readFileSync(filePath);
    const base64Audio = audioBuffer.toString("base64");

    // === 🌐 Gửi lên Gemini để chuyển thành văn bản ===
    const GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    const body = {
      contents: [
        {
          parts: [
            {
              text: "Hãy nhận dạng và phiên âm giọng nói tiếng Việt từ file âm thanh này.",
            },
            {
              inlineData: {
                mimeType: "audio/wav",
                data: base64Audio,
              },
            },
          ],
        },
      ],
    };

    const geminiResponse = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini error:", geminiData);
      return res.status(500).json({
        error: "Gemini API error",
        details: geminiData,
      });
    }

    const transcription =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "(Không nhận được văn bản)";

    // ✅ Trả về kết quả
    return res.status(200).json({
      message: "✅ Đã nhận file rec.wav và gửi lên Gemini thành công!",
      filename: fileName,
      size,
      text: transcription,
    });
  } catch (err) {
    console.error("🔥 Lỗi xử lý file:", err);
    return res.status(500).json({
      error: err.message || "Lỗi server khi xử lý file.",
    });
  }
}

export default async function handler(req, res) {
  try {
    // Đường dẫn đến file WAV trên Vercel
    const filePath = path.join(process.cwd(), 'public', 'voice.wav');
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    // Gửi sang Apps Script
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbxXXXXX/exec';
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: base64Data,
        mimeType: 'audio/wav'
      })
    });

    const result = await response.json();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


