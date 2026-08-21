/**
 * Proxy Cloudflare minimal pour LeekPay.
 * La clé secrète reste dans les secrets du Worker et n'est jamais exposée au navigateur.
 */
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return handleCors();
    }

    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/leekpay")) {
        return await handleLeekPay(request, env);
      }

      return new Response("Not found", {
        status: 404,
        headers: corsHeaders(),
      });
    } catch (error) {
      console.error("Proxy error:", error);
      return new Response(
        JSON.stringify({
          error: "Proxy error",
          message: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: corsHeaders() },
      );
    }
  },
};

async function handleLeekPay(request, env) {
  if (!env.LEEKPAY_SECRET_KEY) {
    return new Response(
      JSON.stringify({ error: "LeekPay credentials not configured" }),
      { status: 500, headers: corsHeaders() },
    );
  }

  const url = new URL(request.url);
  const apiPath = url.pathname.replace("/api/leekpay", "");
  const leekPayApiUrl = `https://leekpay.fr/api/v1${apiPath}${url.search}`;
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${env.LEEKPAY_SECRET_KEY}`);
  headers.set("Content-Type", "application/json");

  const leekPayRequest = new Request(leekPayApiUrl, {
    method: request.method,
    headers,
    body: request.method !== "GET" ? request.body : undefined,
  });
  const response = await fetch(leekPayRequest);
  const proxiedResponse = new Response(response.body, response);
  proxiedResponse.headers.set("Access-Control-Allow-Origin", "*");
  proxiedResponse.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS",
  );
  proxiedResponse.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type",
  );
  return proxiedResponse;
}

function handleCors() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}
