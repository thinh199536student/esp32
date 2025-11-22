export const config = {
  runtime: "nodejs", // QUAN TRỌNG: tắt chunked
};

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      const msg = JSON.stringify({ error: "Only POST allowed" });
      return new Response(msg, {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(msg).toString()
        }
      });
    }

    const body = await req.json();
    const text = body.text || "";

    if (!text.trim()) {
      const msg = JSON.stringify({ error: "Missing text field" });
      return new Response(msg, {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(msg).toString()
        }
      });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      const msg = JSON.stringify({ error: "Missing GOOGLE_API_KEY" });
      return new Response(msg, {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(msg).toString()
        }
      });
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
      const msg = JSON.stringify({ error: "Google TTS error", raw: data });
      return new Response(msg, {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(msg).toString()
        }
      });
    }

    const responseBody = JSON.stringify({
      audioContent: data.audioContent
    });

    return new Response(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(responseBody).toString()
      }
    });

  } catch (err) {
    const msg = JSON.stringify({ error: err.message });
    return new Response(msg, {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(msg).toString()
      }
    });
  }
}
