export const config = {
  runtime: "nodejs18.x"   // <<< FIX QUAN TRỌNG
};

// Base64URL encode
function base64urlEncode(bytes) {
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(str, "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function pemToBinary(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  return Buffer.from(b64, "base64");
}

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

  const headerB64 = base64urlEncode(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(Buffer.from(JSON.stringify(payload)));

  const toSign = `${headerB64}.${payloadB64}`;

  const privateKey = {
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    padding: crypto.constants.RSA_PKCS1_PADDING
  };

  const signature = crypto.sign("RSA-SHA256", Buffer.from(toSign), privateKey);

  return `${toSign}.${base64urlEncode(signature)}`;
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
    if (!tokenResp.ok) return new Response(JSON.stringify(tokenJson), { status: 500 });

    const accessToken = tokenJson.access_token;

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

    const out = JSON.stringify({ audioContent: ttsJson.audioContent });

    return new Response(out, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Connection": "close"
      }
    });


  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

