export const config = {
  runtime: "nodejs20.x"    
};

import crypto from "crypto";

// Base64URL encode
function base64urlEncode(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// PEM → Buffer
function pemToBinary(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  return Buffer.from(b64, "base64");
}

// Create Google OAuth JWT
async function createAccessToken() {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: process.env.GOOGLE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const toSign = `${headerB64}.${payloadB64}`;

  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");

  const signature = crypto.sign("RSA-SHA256", Buffer.from(toSign), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  });

  return `${toSign}.${base64urlEncode(signature)}`;
}

export default async function handler(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return new Response(`{"error":"No text"}`, {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const jwt = await createAccessToken();

    // Exchange JWT → access_token
    const tokenResp = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
      }
    );

    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) {
      return new Response(JSON.stringify(tokenJson), { status: 500 });
    }

    const accessToken = tokenJson.access_token;

    // Google TTS
    const ttsResp = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "vi-VN", name: "vi-VN-Wavenet-A" },
          audioConfig: {
            audioEncoding: "LINEAR16",
            sampleRateHertz: 16000
          }
        })
      }
    );

    const ttsJson = await ttsResp.json();
    if (!ttsResp.ok) {
      return new Response(JSON.stringify(ttsJson), { status: 500 });
    }

    // ⭐ TRẢ JSON KHÔNG CHUNKED
    const body = JSON.stringify({ audioContent: ttsJson.audioContent });

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body).toString(),
        "Cache-Control": "no-store"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.toString() }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
