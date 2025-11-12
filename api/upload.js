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

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Formidable error:", err);
      return res.status(500).json({ error: "Formidable parse error" });
    }

    try {
      const file = files.file?.[0] || files.file;
      if (!file) {
        return res.status(400).json({ error: "no file uploaded" });
      }

      const fileData = fs.readFileSync(file.filepath);
      console.log("✅ Received file:", file.originalFilename, "size:", file.size);

      // ---- test output ----
      return res.status(200).json({
        message: "✅ Đã nhận file thành công!",
        filename: file.originalFilename,
        size: file.size,
      });
    } catch (e) {
      console.error("🔥 Error processing file:", e);
      return res.status(500).json({ error: e.message });
    }
  });
}

const fileData = fs.readFileSync("/tmp/rec.wav").toString("base64");
const res = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Transcribe the following Vietnamese audio:" },
            { inline_data: { mime_type: "audio/wav", data: fileData } }
          ]
        }
      ],
      generationConfig: { maxOutputTokens: 200 }
    }),
  }
);
console.log(await res.json());
