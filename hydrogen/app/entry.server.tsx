import type { AppLoadContext, EntryContext } from "@shopify/remix-oxygen";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
// @ts-expect-error no types for browser subpath
import { renderToReadableStream } from "react-dom/server.browser";
import { createContentSecurityPolicy } from "@shopify/hydrogen";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  context: AppLoadContext
) {
  // We use createContentSecurityPolicy only to get the nonce + NonceProvider
  // so that useNonce() in root.tsx works correctly. We do NOT use the generated
  // CSP header because React Router v7 streaming scripts don't receive nonces,
  // which blocks hydration. Instead we use a permissive CSP with 'unsafe-inline'.
  const { nonce, NonceProvider } = createContentSecurityPolicy(
    context.env
      ? {
          shop: {
            checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
            storeDomain: context.env.PUBLIC_STORE_DOMAIN,
          },
        }
      : {}
  );

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter context={remixContext} url={request.url} />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error: unknown) {
        console.error(error);
        responseStatusCode = 500;
      },
    }
  );

  if (isbot(request.headers.get("user-agent") ?? "")) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");

  // Use 'unsafe-inline' so React Router streaming hydration scripts are not
  // blocked by CSP. A nonce-based policy would block them because those inline
  // scripts are injected without nonces by React Router's streaming layer.
  responseHeaders.set(
    "Content-Security-Policy",
    [
      "default-src 'self' 'unsafe-inline' https://cdn.shopify.com https://shopify.com http://localhost:* ws://localhost:* wss://localhost:* https://*.yotpo.com https://cdn.judge.me https://*.judge.me",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: https: http: blob:",
      "media-src 'self' https: blob:",
      "connect-src 'self' https://cdn.shopify.com https://shopify.com https://*.myshopify.com http://localhost:* ws://localhost:* wss://localhost:* https://*.yotpo.com https://*.judge.me",
      "font-src 'self' https: data:",
      "frame-src https://www.youtube.com https://player.vimeo.com https://shopify.com https://*.yotpo.com https://maps.google.com https://www.google.com",
    ].join("; ")
  );

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
