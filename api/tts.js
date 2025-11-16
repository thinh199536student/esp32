export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Thử dùng API key trong header (một số trường hợp có thể work)
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const ttsUrl = "https://texttospeech.googleapis.com/v1/text:synthesize";
    
    const ttsResponse = await fetch(`${ttsUrl}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey  // Thử thêm header này
      },
      body: JSON.stringify({
        input: { text: text },
        voice: {
          languageCode: "vi-VN",
          name: "vi-VN-Wavenet-A"
        },
        audioConfig: {
          audioEncoding: "LINEAR16",
          sampleRateHertz: 16000
        }
      })
    });

    const ttsJson = await ttsResponse.json();

    if (!ttsResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Google TTS API failed",
          details: ttsJson,
          hint: "Cần setup OAuth2 Service Account hoặc kiểm tra API key đã enable Text-to-Speech API chưa"
        }),
        { 
          status: ttsResponse.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const audioContent = ttsJson.audioContent;
    if (!audioContent) {
      return new Response(
        JSON.stringify({
          error: "No audioContent in TTS response",
          raw: ttsJson
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        audioContent: audioContent,
        encoding: "LINEAR16",
        sampleRate: 16000
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Server error",
        details: String(err)
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
