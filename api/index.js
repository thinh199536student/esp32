export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  try {
    // Chỉ cho POST
    if (req.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    // -----------------------------
    // SAFE PARSE JSON BODY
    // -----------------------------
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

    if (!text || text.length === 0) {
      return Response.json(
        { error: "Missing text field" },
        { status: 400 }
      );
    }

    // --------------------------------
    // CALL GOOGLE GEN-LANG TTS API
    // --------------------------------
    const apiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models?key=" +
      process.env.GOOGLE_API_KEY;

    const apiRes = await fetch(apiUrl, {
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
    });

    // --------------------------------
    // DEBUG GOOGLE RESPONSE
    // --------------------------------

    // Log status
    console.log("GOOGLE STATUS:", apiRes.status);

    // Read response as text
    const rawText = await apiRes.text();

    // Log raw body
    console.log("GOOGLE RAW RESPONSE:", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (err) {
      return Response.json(
        {
          error: "Google API did not return valid JSON",
          status: apiRes.status,
          raw: rawText,
        },
        { status: 500 }
      );
    }

    // Check dữ liệu hợp lệ
    if (!data.audioContent) {
      return Response.json(
        {
          error: "Không có audioContent trong response",
          status: apiRes.status,
          raw: data,
        },
        { status: 500 }
      );
    }

    // Trả kết quả
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






