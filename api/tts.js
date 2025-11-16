export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  try {
    const body = await req.json();
    const text = body?.text;

    if (!text) {
      return new Response(JSON.stringify({ error: "Text missing" }), { status: 400 });
    }

    const ssml = `
      <speak version="1.0" xml:lang="vi-VN">
        <voice name="vi-VN-HoaiMyNeural">
          ${text}
        </voice>
      </speak>
    `;

    const resp = await fetch(
      "https://speech.platform.bing.com/synthesize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "raw-16khz-16bit-mono-pcm",
          "User-Agent": "ESP32-TTS"
        },
        body: ssml
      }
    );

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: "TTS request failed", status: resp.status }),
        { status: 500 }
      );
    }

    const buffer = await resp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return new Response(
      JSON.stringify({
        audioContent: base64,
        sampleRate: 16000,
        encoding: "LINEAR16"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error", details: String(err) }),
      { status: 500 }
    );
  }
}
