// api/upload.js
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false }, // cần tắt bodyParser để nhận multipart/form-data
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
      uploadDir: "/tmp", // nơi lưu file tạm trên Vercel
    });

    // ⚙️ Parse form-data
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

    // ⚙️ Kiểm tra đúng tên file
    if (fileName !== "rec.wav") {
      return res.status(400).json({ error: "Sai tên file, cần là rec.wav" });
    }

    // ⚙️ Kiểm tra dung lượng file thực
    const stats = fs.statSync(filePath);
    const size = stats.size;

    console.log("✅ Nhận file:", fileName, "size:", size, "bytes");

    // ✅ Trả phản hồi thành công
    return res.status(200).json({
      message: "✅ Đã nhận file rec.wav thành công!",
      filename: fileName,
      size,
      savedTo: filePath,
    });
  } catch (err) {
    console.error("🔥 Lỗi xử lý file:", err);
    return res.status(500).json({
      error: err.message || "Lỗi server khi xử lý file.",
    });
  }
}
