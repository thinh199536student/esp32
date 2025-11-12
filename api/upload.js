import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";

export const config = {
  api: { bodyParser: false }, // cần tắt bodyParser để xử lý multipart/form-data
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // ⚙️ Khởi tạo parser
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      uploadDir: "/tmp", // thư mục tạm trên Vercel
    });

    // ⚙️ Phân tích form
    const [fields, files] = await form.parse(req);

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

    // 🚀 Gửi lên Gemini API (Google AI Studio)
    const geminiApiKey = "AIzaSyAx4yV9wwsBn84m5KONs4Lz5EV2oDjkoZI";
    const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-robotics-er-1.5-preview:generateContent?key=" + geminiApiKey;

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
              text: "Hãy phân tích nội dung của đoạn ghi âm này và trả lời bằng tiếng Việt.",
            },
          ],
        },
      ],
    };

    const geminiResponse = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    const geminiResult = await geminiResponse.json();

    // ✅ Trả kết quả về client
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
