export const config = {
  runtime: "edge"
};

// Base64URL encode
function base64urlEncode(bytes) {
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Convert PEM → Uint8Array
function pemToBinary(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Create JWT for Google OAuth
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

  const headerB64 = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const payloadB64 = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const toSign = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBinary(process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(toSign)
  );

  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  return `${toSign}.${signatureB64}`;
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

    // STEP 1: create JWT
    const jwt = await createAccessToken();

    // STEP 2: Exchange JWT → access_token
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) return new Response(JSON.stringify(tokenJson), { status: 500 });

    const accessToken = tokenJson.access_token;

    // STEP 3: Google TTS Request
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
    if (!ttsResp.ok) return new Response(JSON.stringify(ttsJson), { status: 500 });

    // STEP 4: return audioContent (base64 LINEAR16)
    return new Response(
      JSON.stringify({ audioContent: ttsJson.audioContent }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
