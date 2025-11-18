export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    // ----------------------------
    // SAFE JSON PARSE
    // ----------------------------
    let body = {};
    try {
      body = await req.json();
    } catch (err) {
      return Response.json(
        { error: "Body is not valid JSON" },
        { status: 400 }
      );
    }

    const text = body.text || "";

    if (!text || text.length < 1) {
      return Response.json(
        { error: "Missing text field" },
        { status: 400 }
      );
    }

    const apiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-tts:generateSpeech?key=" +
        process.env.GOOGLE_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text,
          audioConfig: {
            audioEncoding: "LINEAR16",
            sampleRateHertz: 16000,
          },
        }),
      }
    );

    let data;
    try {
      data = await apiRes.json();
    } catch (err) {
      return Response.json(
        { error: "Cannot parse JSON from Google API" },
        { status: 500 }
      );
    }

    if (!data.audioContent) {
      return Response.json(
        { error: "Không có audioContent trong response", raw: data },
        { status: 500 }
      );
    }

    return Response.json({
      audioContent: data.audioContent,
    });

  } catch (err) {
    return Response.json(
      { error: "Server crashed", detail: err.message },
      { status: 500 }
    );
  }
}
