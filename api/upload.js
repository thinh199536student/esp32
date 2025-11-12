import multer from "multer";
import nextConnect from "next-connect";

const upload = multer({ storage: multer.memoryStorage() });

const apiRoute = nextConnect({
  onError(error, req, res) {
    console.error("❌ Lỗi upload:", error);
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.use(upload.single("file"));

apiRoute.post(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Không có file nào được upload!" });
    }

    console.log("📦 Nhận file:", req.file.originalname, req.file.mimetype, req.file.size);

    res.status(200).json({
      message: "✅ Đã nhận file thành công!",
      filename: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    console.error("❌ Lỗi khi xử lý:", err);
    res.status(500).json({ error: err.message });
  }
});

export const config = {
  api: {
    bodyParser: false, // quan trọng: tắt parser mặc định để multer hoạt động
  },
};

export default apiRoute;
