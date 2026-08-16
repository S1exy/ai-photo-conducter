const api = process.env.SMOKE_API_BASE || 'http://127.0.0.1:3000/api/v1';

async function json(response) {
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const login = await json(await fetch(`${api}/auth/wechat-login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: `dev-review-${Date.now()}` }),
}));
const auth = { Authorization: `Bearer ${login.accessToken}` };
const templates = await json(await fetch(`${api}/templates`));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const form = new FormData();
form.append('file', new Blob([png], { type: 'image/png' }), 'review.png');
const asset = await json(await fetch(`${api}/assets/images`, { method: 'POST', headers: auth, body: form }));
const job = await json(await fetch(`${api}/generations`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': `review-${Date.now()}` },
  body: JSON.stringify({
    templateVersionId: templates[0].versionId,
    inputAssetId: asset.id,
    aspectRatio: templates[0].ratios[0],
  }),
}));
await new Promise((resolve) => setTimeout(resolve, 1200));
const finished = await json(await fetch(`${api}/generations/${job.id}`, { headers: auth }));
if (finished.status !== 'SUCCEEDED') throw new Error(`generation ended as ${finished.status}`);

const creations = await json(await fetch(`${api}/creations`, { headers: auth }));
const creation = creations[0];
const publication = await json(await fetch(`${api}/creations/${creation.id}/publication`, {
  method: 'POST', headers: auth,
}));

const admin = await json(await fetch(`${api}/auth/local-admin-login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: process.env.ADMIN_LOCAL_PASSWORD }),
}));
const adminAuth = { Authorization: `Bearer ${admin.accessToken}` };
const pending = await json(await fetch(`${api}/admin/reviews?status=PENDING_REVIEW`, { headers: adminAuth }));
await json(await fetch(`${api}/admin/reviews/${publication.id}/approve`, { method: 'POST', headers: adminAuth }));
const feed = await json(await fetch(`${api}/publications/feed`));

console.log(JSON.stringify({
  generationStatus: finished.status,
  publicationSubmitted: pending.some((item) => item.id === publication.id),
  publicationPublished: feed.some((item) => item.id === publication.id),
  feedSize: feed.length,
}, null, 2));
