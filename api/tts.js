export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400
      });
    }

    // Gọi Gemini
    const geminiResp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_GEMINI_API_KEY",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `Hãy tạo file âm thanh WAV Linear16 16000Hz mono từ đoạn văn sau:\n${text}` }
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

    const data = await geminiResp.json();

    if (!data.candidates || !data.candidates[0].content.parts[0].inlineData) {
      return new Response(JSON.stringify({ error: "Gemini error", data }), {
        status: 500
      });
    }

    const audioBase64 = data.candidates[0].content.parts[0].inlineData.data;

    return new Response(
      JSON.stringify({
        audioContent: audioBase64,
        encoding: "LINEAR16",
        sampleRate: 16000
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "Server error",
        details: String(e)
      }),
      { status: 500 }
    );
  }
}
