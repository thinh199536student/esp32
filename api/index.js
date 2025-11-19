export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    const { text } = await req.json();
    if (!text) {
      return Response.json({ error: "Missing text" }, { status: 400 });
    }

    const apiUrl =
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=" +
      process.env.GOOGLE_API_KEY;

    const payload = {
      input: { text },
      voice: {
        languageCode: "vi-VN",
        name: "vi-VN-Wavenet-A",
      },
      audioConfig: {
        audioEncoding: "LINEAR16", // WAV 16bit
        speakingRate: 1.0,
      },
    };

    const apiRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await apiRes.text();
    if (!apiRes.ok) {
      return Response.json(
        { error: "Google TTS error", status: apiRes.status, raw },
        { status: 500 }
      );
    }

    const data = JSON.parse(raw);

    return Response.json({
      audioContent: data.audioContent, // base64 WAV
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
