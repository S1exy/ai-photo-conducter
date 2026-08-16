const api = 'http://127.0.0.1:3000/api/v1';

async function json(response) {
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const loginCode = process.env.SMOKE_LOGIN_CODE || `dev-smoke-${Date.now()}`;
const login = await json(await fetch(`${api}/auth/wechat-login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: loginCode }),
}));
const auth = { Authorization: `Bearer ${login.accessToken}` };
const templates = await json(await fetch(`${api}/templates`, { headers: auth }));

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const form = new FormData();
form.append('file', new Blob([png], { type: 'image/png' }), 'smoke.png');
const asset = await json(await fetch(`${api}/assets/images`, { method: 'POST', headers: auth, body: form }));

const job = await json(await fetch(`${api}/generations`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': `smoke-${Date.now()}` },
  body: JSON.stringify({
    templateVersionId: templates[0].versionId,
    inputAssetId: asset.id,
    aspectRatio: templates[0].ratios[0],
  }),
}));

await new Promise((resolve) => setTimeout(resolve, 1200));
const finished = await json(await fetch(`${api}/generations/${job.id}`, { headers: auth }));
const live = await json(await fetch(`${api}/health/live`));

console.log(JSON.stringify({
  live: live.status,
  templateCount: templates.length,
  nickname: login.user.nickname,
  uploadSafety: asset.safetyStatus,
  generationStatus: finished.status,
  hasOutput: Boolean(finished.outputAssetId),
}, null, 2));

if (finished.status !== 'SUCCEEDED' || !finished.outputAssetId) process.exit(1);
