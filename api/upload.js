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
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      uploadDir: "/tmp",
    });

    // ✅ Parse form đúng cách
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = files.file;
    if (!file) {
      return res.status(400).json({ error: "Không có file được tải lên" });
    }

    const uploadedFile = Array.isArray(file) ? file[0] : file;
    const filePath = uploadedFile.filepath || uploadedFile.path;
    const fileName = uploadedFile.originalFilename || "audio.wav";
    const stats = fs.statSync(filePath);
    const size = stats.size;

    console.log("✅ Nhận file:", fileName, "size:", size);

    // 🔒 Giới hạn file lớn
    if (size > 1024 * 1024 * 3) { // >3MB
      return res.status(400).json({ error: "File quá lớn (>3MB)" });
    }

    // 📤 Đọc file nhị phân (async)
    const fileBuffer = await fs.promises.readFile(filePath);
    const base64Audio = fileBuffer.toString("base64");

    console.log("📦 Đã encode base64, độ dài:", base64Audio.length);

    // 🚀 Gửi tới Gemini
    const geminiApiKey = "AIzaSyAx4yV9wwsBn84m5KONs4Lz5EV2oDjkoZI";
    const geminiEndpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
      geminiApiKey;

    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "audio/wav",
                data: base64Audio,
              },
            },
            { text: "Chuyển đoạn ghi âm tiếng Việt này thành văn bản." },
          ],
        },
      ],
    };

    console.log("🚀 Gửi request tới Gemini...");

    const geminiResponse = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    const text = await geminiResponse.text();
    console.log("📥 Phản hồi Gemini:", text.slice(0, 300)); // log 300 ký tự đầu

    if (!geminiResponse.ok) {
      return res.status(500).json({
        error: "Gemini API lỗi",
        status: geminiResponse.status,
        body: text,
      });
    }

    const geminiResult = JSON.parse(text);

    return res.status(200).json({
      message: "✅ Đã gửi file lên Gemini thành công!",
      filename: fileName,
      size,
      geminiReply: geminiResult,
    });
  } catch (err) {
    console.error("🔥 Lỗi tổng quát:", err);
    return res.status(500).json({ error: err.message || "Lỗi server không xác định." });
  }
}
