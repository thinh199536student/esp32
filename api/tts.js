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

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Gọi Google Cloud Text-to-Speech API (KHÔNG phải Gemini)
    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    const ttsResponse = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: { text: text },
        voice: {
          languageCode: "vi-VN",
          name: "vi-VN-Wavenet-A"  // Giọng tiếng Việt
        },
        audioConfig: {
          audioEncoding: "LINEAR16",  // PCM 16-bit
          sampleRateHertz: 16000
        }
      })
    });

    const ttsJson = await ttsResponse.json();

    if (!ttsResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Google TTS API failed",
          details: ttsJson
        }),
        { 
          status: ttsResponse.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Lấy audio base64 từ response
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

    // Trả về cho ESP32
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
