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
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const text = body.text || "";
    if (!text) {
      return Response.json({ error: "Missing text" }, { status: 400 });
    }

    // 🔥 Endpoint TTS CHUẨN
    const apiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      process.env.GOOGLE_API_KEY;

    const apiRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: text
              }
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "audio/wav",
        },
      }),
    });

    console.log("GOOGLE STATUS:", apiRes.status);
    const raw = await apiRes.text();
    console.log("GOOGLE RAW RESPONSE:", raw);

    if (!apiRes.ok) {
      return Response.json(
        { error: "Google API Error", status: apiRes.status, raw },
        { status: apiRes.status }
      );
    }

    const data = JSON.parse(raw);

    const audioBase64 =
      data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioBase64) {
      return Response.json(
        {
          error: "Missing audioContent",
          raw: data,
        },
        { status: 500 }
      );
    }

    return Response.json({ audioContent: audioBase64 });

  } catch (err) {
    return Response.json(
      { error: "Server crashed", detail: err.message },
      { status: 500 }
    );
  }
}

