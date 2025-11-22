export const config = {
  runtime: "nodejs",
};

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return plainResponse({ error: "Only POST allowed" }, 405);
    }

    const body = await req.json();
    const text = body.text?.trim();

    if (!text) {
      return plainResponse({ error: "Missing text" }, 400);
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return plainResponse({ error: "Missing GOOGLE_API_KEY" }, 500);
    }

    // Tối ưu fetch (timeout 6 giây)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const googleRes = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "vi-VN", name: "vi-VN-Neural2-D" },
          audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 8000 }
        }),
        signal: controller.signal
      }
    ).catch(err => ({ error: err }));

    clearTimeout(timeout);

    if (!googleRes || googleRes.error) {
      return plainResponse({ error: "Google TTS timeout" }, 504);
    }

    const data = await googleRes.json();

    if (!data.audioContent) {
      return plainResponse({ error: "Google TTS error", raw: data }, 500);
    }

    return plainResponse({ audioContent: data.audioContent }, 200);

  } catch (err) {
    return plainResponse({ error: err.message }, 500);
  }
}

/* Helper: Trả về JSON + Content-Length */
function plainResponse(obj, status = 200) {
  const body = JSON.stringify(obj);
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body).toString()
    }
  });
}
