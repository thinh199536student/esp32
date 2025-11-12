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
    // ⚙️ Khởi tạo formidable parser
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      uploadDir: "/tmp", // thư mục tạm trên Vercel
    });

    // ⚙️ Parse form-data (trả về Promise)
    const [fields, files] = await form.parse(req);

    // ⚙️ Lấy file đầu tiên
    const file = files.file;
    if (!file) {
      return res.status(400).json({ error: "Không có file nào được tải lên" });
    }

    // ⚙️ Lấy thông tin file
    const uploadedFile = Array.isArray(file) ? file[0] : file;
    const filePath = uploadedFile.filepath || uploadedFile.path;
    const fileName = uploadedFile.originalFilename || "unknown.wav";

    // ✅ Không bắt buộc phải đúng tên “rec.wav” (nếu bạn chỉ cần upload file)
    // Nếu bạn muốn giới hạn, có thể bật dòng sau:
    // if (fileName !== "rec.wav") return res.status(400).json({ error: "Sai tên file, cần là rec.wav" });

    // ⚙️ Kiểm tra dung lượng file
    const stats = fs.statSync(filePath);
    const size = stats.size;

    console.log("✅ Nhận file:", fileName, "size:", size, "bytes");

    // 📤 Đọc file và chuyển sang base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");

    // 🚀 Gửi dữ liệu lên Google Apps Script (phải là URL /exec)
    const scriptUrl = "https://script.google.com/macros/s/AKfycbxYourScriptID/exec"; // <-- Thay đúng URL deploy Web App

    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio: base64Data,
        mimeType: "audio/wav",
        filename: fileName,
      }),
    });

    // 📥 Đọc kết quả từ Apps Script
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    // ✅ Trả phản hồi thành công
    return res.status(200).json({
      message: "✅ Đã nhận và gửi file lên Apps Script thành công!",
      filename: fileName,
      size,
      scriptResponse: result,
    });
  } catch (err) {
    console.error("🔥 Lỗi xử lý file:", err);
    return res.status(500).json({
      error: err.message || "Lỗi server khi xử lý file.",
    });
  }
}
