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

    // ✅ Cách parse đúng (chuyển callback -> Promise)
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = files.file;
    if (!file) {
      return res.status(400).json({ error: "Không có file nào được tải lên" });
    }

    const uploadedFile = Array.isArray(file) ? file[0] : file;
    const filePath = uploadedFile.filepath || uploadedFile.path;
    const fileName = uploadedFile.originalFilename || "audio.wav";

    const stats = fs.statSync(filePath);
    const size = stats.size;

    console.log("✅ Nhận file:", fileName, "size:", size, "bytes");

    // 📤 Đọc file và mã hóa base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Audio = fileBuffer.toString("base64");

    // 🚀 Gửi lên Gemini API
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
            { text: "Hãy chuyển đoạn ghi âm tiếng Việt này thành văn bản." },
          ],
        },
      ],
    };

    const geminiResponse = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("❌ Gemini error:", errorText);
      return res.status(500).json({
        error: "Gemini API error",
        status: geminiResponse.status,
        details: errorText,
      });
    }

    const geminiResult = await geminiResponse.json();

    // ✅ Trả kết quả
    return res.status(200).json({
      message: "✅ Đã gửi file lên Gemini thành công!",
      filename: fileName,
      size,
      geminiReply: geminiResult,
    });
  } catch (err) {
    console.error("🔥 Lỗi xử lý:", err);
    return res.status(500).json({ error: err.message || "Lỗi server." });
  }
}
