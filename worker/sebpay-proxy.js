/**
 * Proxy Cloudflare minimal pour SebPay.
 * Les cles restent dans les secrets du Worker et ne sont jamais exposees au navigateur.
 */
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return handleCors();
    }

    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/sebpay")) {
        return await handleSebPay(request, env);
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

async function handleSebPay(request, env) {
  if (!env.SEBPAY_PUBLIC_KEY || !env.SEBPAY_SECRET_KEY) {
    return new Response(
      JSON.stringify({ error: "SebPay credentials not configured" }),
      { status: 500, headers: corsHeaders() },
    );
  }

  const url = new URL(request.url);
  const apiPath = url.pathname.replace("/api/sebpay", "");
  const sebPayApiUrl = `https://newapi.sebpay.bj/api/v1${apiPath}`;
  const headers = new Headers(request.headers);
  headers.set("X-Public-Key", env.SEBPAY_PUBLIC_KEY);
  headers.set("X-Secret-Key", env.SEBPAY_SECRET_KEY);

  const sebPayRequest = new Request(sebPayApiUrl, {
    method: request.method,
    headers,
    body: request.body,
  });
  const response = await fetch(sebPayRequest);
  const proxiedResponse = new Response(response.body, response);
  proxiedResponse.headers.set("Access-Control-Allow-Origin", "*");
  proxiedResponse.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  proxiedResponse.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  return proxiedResponse;
}

function handleCors() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
}
