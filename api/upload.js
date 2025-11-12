import multer from 'multer';
import nextConnect from 'next-connect';
import fs from 'fs';

const upload = multer({ storage: multer.memoryStorage() });

const apiRoute = nextConnect({
  onError(error, req, res) {
    res.status(501).json({ error: `Lỗi: ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Phương thức ${req.method} không được hỗ trợ` });
  },
});

apiRoute.use(upload.single('file'));

apiRoute.post(async (req, res) => {
  const { buffer, originalname, mimetype } = req.file;
  console.log(`📦 Nhận file: ${originalname} (${mimetype}), size=${buffer.length}`);

  // Gửi tiếp file sang Google Apps Script hoặc Gemini API ở đây...
  res.status(200).json({ message: '✅ Đã nhận file thành công!' });
});

export default apiRoute;
export const config = {
  api: { bodyParser: false },
};
