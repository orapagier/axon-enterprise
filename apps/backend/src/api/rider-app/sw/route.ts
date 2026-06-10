import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /rider-app/sw — service worker. Network-first for the app shell so
 * updates ship instantly, with the cached copy as the offline fallback. API
 * calls (/rider/*) are never intercepted: delivery confirmations must hit the
 * server or visibly fail — a silently queued "delivered" would corrupt the
 * cash ledger's meaning to the rider.
 */
const SW_JS = `
var CACHE = 'mfh-rider-v1';
var SHELL = '/rider-app';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.add(SHELL); }).catch(function () {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname !== SHELL) return;
  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      })
      .catch(function () { return caches.match(e.request); })
  );
});
`

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache")
  res.send(SW_JS)
}
