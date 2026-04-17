// Vercel Serverless Function — proxies requests to data.stad.gent
export const config = { runtime: 'edge' };

const ALLOWED_DATASETS = new Set([
  'bezetting-parkeergarages-real-time',
  'luchtkwaliteit-gent',
  'cultuur-events-gent',
  'locaties-mobiele-blauwe-fietspompen-gent',
]);

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const dataset = searchParams.get('dataset');

  if (!dataset || !ALLOWED_DATASETS.has(dataset)) {
    return new Response(
      JSON.stringify({ error: 'Unknown or missing dataset' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const forward = new URLSearchParams();
  searchParams.forEach((v, k) => { if (k !== 'dataset') forward.append(k, v); });

  const upstream = `https://data.stad.gent/api/explore/v2.1/catalog/datasets/${dataset}/records?${forward}`;

  try {
    const r = await fetch(upstream, { headers: { 'accept': 'application/json' } });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
        'access-control-allow-origin': '*',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Upstream fetch failed', detail: String(err) }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }
}
