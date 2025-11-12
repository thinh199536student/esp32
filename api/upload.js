// api/upload.js
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false }, // Tắt body parser mặc định để nhận file nhị phân
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // === Bước 1: Parse form-data nhận từ ESP32 ===
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable({ multiples: false });
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // === Bước 2: Kiểm tra file ===
    const file = files.file?.[0] || files.file;
    if (!file) {
      return res.status(400).json({ error: "Không tìm thấy file tải lên" });
    }

    // === Bước 3: Kiểm tra đúng file rec.wav ===
    const filename = file.originalFilename || "";
    if (filename !== "rec.wav") {
      return res.status(400).json({ error: "Tên file không hợp lệ, yêu cầu rec.wav" });
    }

    // === Bước 4: Lưu file tạm (tùy chọn, để debug) ===
    const destPath = `/tmp/${filename}`;
    fs.copyFileSync(file.filepath, destPath);

    console.log("✅ Đã nhận file:", filename, "dung lượng:", file.size, "bytes");
    return res.status(200).json({
      message: "✅ Đã nhận file rec.wav thành công!",
      filename,
      size: file.size,
      savedTo: destPath,
    });
  } catch (err) {
    console.error("🔥 Lỗi xử lý file:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
