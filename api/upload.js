import formidable from 'formidable';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const filePath = files.audio[0].filepath;
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    // Gửi sang Apps Script
    const response = await fetch('https://script.google.com/macros/library/d/16SZA-1AAYnbGVUimvIG2DaavRRaKH0gAYzqzFoI4ySDJTOLDFdBgbMzT/3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: base64Data, mimeType: 'audio/wav' }),
    });

    const result = await response.json();
    res.status(200).json(result);
  });
}
