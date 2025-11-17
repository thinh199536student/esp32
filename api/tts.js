export const config = {
  runtime: "edge"
};

async function createAccessToken() {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const payload = {
    iss: process.env.GOOGLE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encoder = new TextEncoder();
  const data = `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(payload))}`;

  const privateKeyPem = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");

  const key = await crypto.subtle.importKey(
    "pkcs8",
    convertPemToBinary(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(data)
  );

  return `${data}.${base64url(signature)}`;
}

function base64url(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function convertPemToBinary(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const raw = atob(b64);
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buffer[i] = raw.charCodeAt(i);
  return buffer;
}

export default async function handler(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return new Response(`{"error":"No text provided"}`, {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const jwt = await createAccessToken();

    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const tokenJson = await tokenResp.json();

    if (!tokenResp.ok) {
      return new Response(JSON.stringify(tokenJson), { status: 500 });
    }

    const accessToken = tokenJson.access_token;

    // Google TTS request
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

    // ⭐ FIX: TRẢ JSON SẠCH — KHÔNG JSON.stringify() object lớn
    return new Response(
      `{"audioContent":"${ttsJson.audioContent}"}`,
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        }
      }
    );

  } catch (err) {
    return new Response(`{"error":"${String(err)}"}`, {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
