import { exec } from "child_process";
import { promisify } from "util";
const run = promisify(exec);

export const config = {
  runtime: "nodejs20.x"
};

export default async function handler(req, res) {
  try {
    const { text } = await req.body
      ? Promise.resolve(req.body)
      : new Promise(resolve => {
          let body = "";
          req.on("data", chunk => (body += chunk));
          req.on("end", () => resolve(JSON.parse(body)));
        });

    if (!text) return res.status(400).json({ error: "Text missing" });

    // Lệnh Edge TTS → xuất ra WAV LINEAR16 16kHz
    const cmd = `edge-tts --text "${text}" --voice vi-VN-HoaiMyNeural --rate=0% --volume=0% --format audio-16khz-16bit-mono-pcm --write-media output.wav`;

    await run(cmd);

    const fs = await import("fs");
    const audio = fs.readFileSync("output.wav");
    const base64 = audio.toString("base64");

    res.status(200).json({
      audioContent: base64,
      sampleRate: 16000,
      encoding: "LINEAR16"
    });
  } catch (e) {
    res.status(500).json({ error: "EdgeTTS error", details: String(e) });
  }
}
