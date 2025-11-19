export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    let body;
    try {
      body = await req.json();
    } catch (err) {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const text = body.text;
    if (!text) {
      return Response.json({ error: "Missing text" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Missing GOOGLE_API_KEY" }, { status: 500 });
    }

    const url =
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + apiKey;

    const payload = {
      input: { text },
      voice: {
        languageCode: "vi-VN",
        name: "vi-VN-Wavenet-A",
      },
      audioConfig: {
        audioEncoding: "LINEAR16",
      },
    };

    const googleRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await googleRes.text();

    if (!googleRes.ok) {
      return Response.json(
        {
          error: "Google TTS error",
          status: googleRes.status,
          raw,
        },
        { status: 500 }
      );
    }

    // Đây là điểm quan trọng: server TRẢ VỀ JSON THUẦN
    return new Response(raw, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Server crashed", detail: err.message },
      { status: 500 }
    );
  }
}
