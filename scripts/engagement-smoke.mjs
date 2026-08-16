const api = process.env.SMOKE_API_BASE || 'http://127.0.0.1:3000/api/v1';
async function json(response) {
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const feed = await json(await fetch(`${api}/publications/feed`));
if (!feed.length) throw new Error('Run test:review-smoke first to create a published work');
const workId = feed[0].id;
const login = await json(await fetch(`${api}/auth/wechat-login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: `dev-engagement-${Date.now()}` }),
}));
const auth = { Authorization: `Bearer ${login.accessToken}` };
const work = await json(await fetch(`${api}/publications/${workId}`, { headers: auth }));
await json(await fetch(`${api}/publications/${workId}/like`, { method: 'POST', headers: auth }));
await json(await fetch(`${api}/publications/${workId}/bookmark`, { method: 'POST', headers: auth }));
await json(await fetch(`${api}/templates/${work.templateId}/bookmark`, { method: 'POST', headers: auth }));
const report = await json(await fetch(`${api}/publications/${workId}/reports`, {
  method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ reasonCode: 'UNCOMFORTABLE' }),
}));

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const form = new FormData();
form.append('file', new Blob([png], { type: 'image/png' }), 'same.png');
const asset = await json(await fetch(`${api}/assets/images`, { method: 'POST', headers: auth, body: form }));
const sameJob = await json(await fetch(`${api}/generations`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': `same-${Date.now()}` },
  body: JSON.stringify({
    templateVersionId: work.templateVersionId, inputAssetId: asset.id,
    aspectRatio: '1:1', sourcePublicationId: workId,
  }),
}));
await new Promise((resolve) => setTimeout(resolve, 1200));
const sameFinished = await json(await fetch(`${api}/generations/${sameJob.id}`, { headers: auth }));
const bookmarks = await json(await fetch(`${api}/bookmarks`, { headers: auth }));
const updated = await json(await fetch(`${api}/publications/${workId}`, { headers: auth }));

const admin = await json(await fetch(`${api}/auth/local-admin-login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: process.env.ADMIN_LOCAL_PASSWORD }),
}));
const adminAuth = { Authorization: `Bearer ${admin.accessToken}` };
const reports = await json(await fetch(`${api}/admin/reports`, { headers: adminAuth }));
await json(await fetch(`${api}/admin/reports/${report.id}/dismiss`, { method: 'POST', headers: adminAuth }));

const result = {
  liked: updated.liked,
  bookmarked: updated.bookmarked,
  publicLikeCount: updated.likes,
  publicBookmarkCount: updated.bookmarks,
  sameTemplateUses: updated.sameTemplateUses,
  sameGenerationStatus: sameFinished.status,
  savedWorkVisible: bookmarks.works.some((item) => item.id === workId),
  savedTemplateVisible: bookmarks.templates.some((item) => item.id === work.templateId),
  reportReachedAdmin: reports.some((item) => item.id === report.id),
};
console.log(JSON.stringify(result, null, 2));
if (!result.liked || !result.bookmarked || result.sameGenerationStatus !== 'SUCCEEDED'
  || !result.savedWorkVisible || !result.savedTemplateVisible || !result.reportReachedAdmin) process.exit(1);
