export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), { status: 405 });
    }

    const body = await req.json();
    const text = body.text || "";

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing text field" }), { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_API_KEY" }), { status: 500 });
    }

    const googleRes = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "vi-VN", name: "vi-VN-Neural2-D" },
          audioConfig: {
            audioEncoding: "LINEAR16",
            sampleRateHertz: 8000
          }
        })
      }
    );

    const data = await googleRes.json();

    if (!data.audioContent) {
      return new Response(JSON.stringify({ error: "Google TTS error", raw: data }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ audioContent: data.audioContent }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
