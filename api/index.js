export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    const body = await req.json();
    const text = body.text || "";

    if (!text || text.length < 1) {
      return Response.json(
        { error: "Missing text field" },
        { status: 400 }
      );
    }

    const apiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gpt-4o-mini-tts:generateSpeech?key=" + process.env.GOOGLE_API_KEY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: text,
        voice: "ALLOY",
        audioConfig: {
          audioEncoding: "LINEAR16",
          sampleRateHertz: 16000
        }
      }),
    });

    const data = await apiRes.json();

    if (!data.audioContent) {
      return Response.json(
        { error: "API không trả audioContent", raw: data },
        { status: 500 }
      );
    }

    return Response.json({
      audioContent: data.audioContent   // base64 WAV
    });

  } catch (err) {
    return Response.json(
      { error: "Server crashed", detail: err.message },
      { status: 500 }
    );
  }
}
