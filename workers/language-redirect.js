/**
 * Cloudflare Worker: redirect Norwegian browsers from polybjorn.com → polybjorn.no
 *
 * Deploy via Cloudflare dashboard → Workers & Pages → Create Worker
 * Then add a Route: polybjorn.com/* → this worker
 *
 * Behaviour:
 * - Checks Accept-Language for Norwegian (no, nb, nn)
 * - Redirects to equivalent path on polybjorn.no
 * - Sets a cookie when user arrives via manual language toggle,
 *   so they won't be redirected again
 * - Skips static assets, bots, and non-GET requests
 */

const NO_DOMAIN = 'https://polybjorn.no';
const COOKIE_NAME = 'lang_pref';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only redirect on polybjorn.com
    if (url.hostname !== 'polybjorn.com') {
      return fetch(request);
    }

    // Skip non-navigational requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return fetch(request);
    }

    // Skip static assets
    if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|xml|txt|webmanifest)$/i.test(url.pathname)) {
      return fetch(request);
    }

    // If ?lang=en is set, store preference and don't redirect
    if (url.searchParams.get('lang') === 'en') {
      const clean = new URL(url);
      clean.searchParams.delete('lang');
      const response = Response.redirect(clean.toString(), 302);
      // Response.redirect returns an immutable response, so we clone
      const mutable = new Response(response.body, response);
      mutable.headers.set('Set-Cookie',
        `${COOKIE_NAME}=en; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`
      );
      return mutable;
    }

    // Respect existing language preference cookie
    const cookies = request.headers.get('Cookie') || '';
    if (cookies.includes(`${COOKIE_NAME}=en`)) {
      return fetch(request);
    }

    // Check Accept-Language for Norwegian
    const acceptLang = request.headers.get('Accept-Language') || '';
    const isNorwegian = /\b(no|nb|nn)\b/i.test(acceptLang);

    if (!isNorwegian) {
      return fetch(request);
    }

    // Redirect to equivalent path on polybjorn.no
    const target = `${NO_DOMAIN}${url.pathname}`;
    return Response.redirect(target, 302);
  }
};
