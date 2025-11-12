import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    // Đường dẫn đến file WAV trên Vercel
    const filePath = path.join(process.cwd(), 'public', 'voice.wav');
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    // Gửi sang Apps Script
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbxXXXXX/exec';
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: base64Data,
        mimeType: 'audio/wav'
      })
    });

    const result = await response.json();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
