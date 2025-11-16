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
        status: 500
      });
    }

    // Gửi yêu cầu TTS đến Gemini
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
Hãy tạo file âm thanh WAV (LINEAR16, 16000Hz, MONO) cho đoạn văn sau:

${text}
                  `
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "audio/wav",
            responseAudioConfig: {
              audioEncoding: "LINEAR16",
              sampleRateHertz: 16000
            }
          }
        })
      }
    );

    const json = await geminiResponse.json();

    // Kiểm tra lỗi
    if (!geminiResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Gemini request failed",
          details: json
        }),
        { status: 500 }
      );
    }

    // Lấy audio base64
    const audio =
      json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audio) {
      return new Response(
        JSON.stringify({
          error: "No audio returned from Gemini",
          raw: json
        }),
        { status: 500 }
      );
    }

    // Trả kết quả về ESP32
    return new Response(
      JSON.stringify({
        audioContent: audio,
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
        error: "Server crash",
        details: String(err)
      }),
      { status: 500 }
    );
  }
}
