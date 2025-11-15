import OpenAI from "openai";

export default async function handler(req, res) {
  const { text } = await req.json();

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    input: text,
    voice: "alloy",
    format: "pcm",      // LINEAR16
    sample_rate: 16000
  });

  const audioBase64 = Buffer.from(await response.arrayBuffer()).toString("base64");

  res.status(200).json({
    audioContent: audioBase64,
    format: "pcm16",
    sampleRate: 16000
  });
}
