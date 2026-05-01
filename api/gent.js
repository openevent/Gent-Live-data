// Vercel Serverless Function -- proxies to data.stad.gent
//
// Two modes:
//   1. /api/gent?dataset=<slug>&...  -> /catalog/datasets/<slug>/records
//   2. /api/gent?catalog=1&q=<text>  -> /catalog/datasets?where=search("<text>")
//      (used by the frontend to auto-discover the right slug for each topic)
export const config = { runtime: 'edge' };

const ALLOWED_DATASETS = new Set([
  // parking
  'bezetting-parkeergarages-real-time',
  // air quality candidates
  'luchtkwaliteit-gent',
  'realtime-luchtkwaliteit-gent',
  'luchtkwaliteit-meetstations-gent',
  // events / culture candidates
  'cultuur-events-gent',
  'evenementen-gent',
  'cultuurevents-gent',
  // bike pumps candidates
  'locaties-mobiele-blauwe-fietspompen-gent',
  'locaties-blauwe-fietspompen-gent',
]);

const ALLOWED_QUERY_TERMS = /^[a-z0-9 \-]{2,40}$/i;

export default async function handler(request) {
  const { searchParams } = new URL(request.url);

  // Mode 2: catalog search
  if (searchParams.get('catalog')) {
    const q = (searchParams.get('q') || '').trim();
    if (!q || !ALLOWED_QUERY_TERMS.test(q)) {
      return jsonResp({ error: 'Missing or invalid q' }, 400);
    }
    const where = encodeURIComponent('search("' + q + '")');
    const upstream =
      'https://data.stad.gent/api/explore/v2.1/catalog/datasets' +
      '?limit=20&where=' + where + '&select=dataset_id,metas';
    return passthrough(upstream);
  }

  // Mode 1: dataset records
  const dataset = searchParams.get('dataset');
  if (!dataset) return jsonResp({ error: 'Missing dataset' }, 400);

  const looksLikeSlug = /^[a-z0-9][a-z0-9-]{1,80}$/.test(dataset);
  if (!ALLOWED_DATASETS.has(dataset) && !looksLikeSlug) {
    return jsonResp({ error: 'Unknown or invalid dataset', dataset }, 400);
  }

  const forward = new URLSearchParams();
  searchParams.forEach((v, k) => { if (k !== 'dataset') forward.append(k, v); });
  const upstream =
    'https://data.stad.gent/api/explore/v2.1/catalog/datasets/' +
    dataset + '/records?' + forward.toString();
  return passthrough(upstream);
}

async function passthrough(upstream) {
  try {
    const r = await fetch(upstream, { headers: { 'accept': 'application/json' } });
    const text = await r.text();
    if (!r.ok) {
      return jsonResp({
        error: 'Upstream error',
        upstream_status: r.status,
        upstream,
        body: safeParse(text),
      }, r.status);
    }
    const parsed = safeParse(text);
    if (parsed && typeof parsed === 'object') parsed._proxy = { upstream };
    return new Response(JSON.stringify(parsed != null ? parsed : text), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
        'access-control-allow-origin': '*',
      },
    });
  } catch (err) {
    return jsonResp({ error: 'Upstream fetch failed', upstream, detail: String(err) }, 502);
  }
}

function jsonResp(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  });
}

function safeParse(text) {
  try { return JSON.parse(text); } catch (e) { return null; }
}
