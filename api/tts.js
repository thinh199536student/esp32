export const config = {
  runtime: "nodejs",  // BẮT BUỘC ĐỂ TẮT CHUNKED
};

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Only POST allowed" }, 405);
    }

    const body = await req.json();
    const text = body.text || "";

    if (!text || text.trim().length === 0) {
      return jsonResponse({ error: "Missing text field" }, 400);
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return jsonResponse({ error: "Missing GOOGLE_API_KEY" }, 500);
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
      return jsonResponse({ error: "Google TTS error", raw: data }, 500);
    }

    return jsonResponse({ audioContent: data.audioContent }, 200);

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

/*
  🔥 Helper tạo JSON response với Content-Length
  → TẮT CHUNKED trên Vercel Node.js Runtime
*/
function jsonResponse(obj, status = 200) {
  const body = JSON.stringify(obj);
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body).toString()
    }
  });
}
