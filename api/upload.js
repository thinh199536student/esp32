import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false }, // để nhận file binary
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Only POST allowed");
  }

  try {
    const form = formidable({ multiples: false });
    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ error: err.message });

      const file = files?.file;
      if (!file) return res.status(400).send("No file uploaded");

      const wav = fs.readFileSync(file.filepath);
      const audioBase64 = wav.toString("base64");

      const GEMINI_KEY = process.env.GEMINI_API_KEY;
      const model = "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

      const payload = {
        contents: [
          {
            parts: [
              { text: "Hãy chuyển giọng nói tiếng Việt này thành văn bản chính xác, không tóm tắt." },
              { inline_data: { mime_type: "audio/wav", data: audioBase64 } }
            ]
          }
        ]
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi từ Gemini";

      res.status(200).json({ text });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
