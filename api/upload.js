import formidable from "formidable";
import fs from "fs";

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

    if (size > 3 * 1024 * 1024) {
      return res.status(400).json({ error: "File quá lớn (>3MB)" });
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    const base64Audio = fileBuffer.toString("base64");

    console.log("📦 Encode xong, chuẩn bị gửi lên Gemini...");

    // ✅ Lấy API key từ biến môi trường Vercel
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      console.error("❌ Không tìm thấy biến môi trường GEMINI_API_KEY");
      return res.status(500).json({
        error: "Thiếu GEMINI_API_KEY trong môi trường Vercel",
      });
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    // 🧩 Log kiểm tra API key và endpoint
    console.log("🔑 API Key có tồn tại không:", geminiApiKey ? "✅ Có" : "❌ Không");
    console.log("🌐 Endpoint đang dùng:", geminiEndpoint);

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
            {
              text: "Chuyển đoạn ghi âm này thành văn bản tiếng Việt.",
            },
          ],
        },
      ],
    };

    const geminiResponse = await fetch(geminiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiPayload),
    });

    const text = await geminiResponse.text();

    if (!geminiResponse.ok) {
      console.error("❌ Gemini API lỗi:", geminiResponse.status, text);
      return res.status(500).json({
        error: "Gemini API lỗi",
        status: geminiResponse.status,
        body: text,
      });
    }

    const geminiResult = JSON.parse(text);

    return res.status(200).json({
      message: "✅ Gửi file lên Gemini thành công!",
      filename: fileName,
      size,
      geminiReply: geminiResult,
    });
  } catch (err) {
    console.error("🔥 Lỗi tổng quát:", err);
    return res.status(500).json({
      error: err.message || "Lỗi server không xác định.",
    });
  }
}
