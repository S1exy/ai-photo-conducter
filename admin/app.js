const api = '/api/v1';
const state = {
  token: sessionStorage.getItem('adminToken') || '',
  status: 'PENDING_REVIEW',
  imageUrls: [],
};

const reasons = {
  ILLEGAL_CONTENT: '违法违规内容',
  SEXUAL_CONTENT: '色情或低俗内容',
  VIOLENCE_DANGER: '暴力或危险内容',
  PRIVACY_RISK: '个人隐私风险',
  COPYRIGHT_RISK: '侵权风险',
  LOW_QUALITY: '图片质量不符合公开要求',
  OTHER_PLATFORM_RULES: '其他平台规则原因',
};

const hints = {
  PENDING_REVIEW: '等待运营人员审核的发布申请',
  PUBLISHED: '已经进入公开作品流的内容',
  REJECTED: '审核未通过且不能原样再次提交的内容',
  WITHDRAWN: '用户主动撤回的发布申请或公开作品',
};

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: state.token ? `Bearer ${state.token}` : '',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join('；') : body.message || '请求失败');
  return body;
}

async function login(password) {
  const result = await request('/auth/local-admin-login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  state.token = result.accessToken;
  sessionStorage.setItem('adminToken', state.token);
}

async function loadProtectedImage(path, image) {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${state.token}` } });
  if (!response.ok) return;
  const url = URL.createObjectURL(await response.blob());
  state.imageUrls.push(url);
  image.src = url;
}

function clearImages() {
  state.imageUrls.forEach((url) => URL.revokeObjectURL(url));
  state.imageUrls = [];
}

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'review-card';
  const actionMarkup = item.status === 'PENDING_REVIEW' ? `
    <div class="actions">
      <label>拒绝时使用预设原因</label>
      <select class="reason-select">
        ${Object.entries(reasons).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
      </select>
      <div class="action-row">
        <button class="reject">拒绝发布</button>
        <button class="approve">通过并公开</button>
      </div>
    </div>` : '';
  card.innerHTML = `
    <div class="images">
      <div class="image-box"><span class="image-label">原始参考图 · 仅运营可见</span><img class="input-image" alt="用户原始参考图" /></div>
      <div class="image-box"><span class="image-label">生成结果 · 待公开</span><img class="output-image" alt="AI 生成结果" /></div>
    </div>
    <div class="review-info">
      <span class="status-pill">${item.status}</span>
      <h3>${item.templateName}</h3>
      <div class="meta">${item.author}<br />模板版本 ${item.templateVersion}.0<br />提交于 ${new Date(item.createdAt).toLocaleString()}</div>
      ${item.reviewReasonCode ? `<div class="reason">${reasons[item.reviewReasonCode] || item.reviewReasonCode}</div>` : ''}
      ${actionMarkup}
    </div>`;
  loadProtectedImage(item.inputImagePath, card.querySelector('.input-image'));
  loadProtectedImage(item.outputImagePath, card.querySelector('.output-image'));
  const approve = card.querySelector('.approve');
  const reject = card.querySelector('.reject');
  if (approve) approve.addEventListener('click', () => review(item.id, 'approve', card));
  if (reject) reject.addEventListener('click', () => review(item.id, 'reject', card));
  return card;
}

async function review(id, action, card) {
  const button = card.querySelector(`.${action}`);
  button.disabled = true;
  try {
    const body = action === 'reject'
      ? JSON.stringify({ reasonCode: card.querySelector('.reason-select').value })
      : undefined;
    await request(`/admin/reviews/${id}/${action}`, { method: 'POST', body });
    await loadReviews();
  } catch (error) {
    window.alert(error.message);
    button.disabled = false;
  }
}

async function loadReviews() {
  clearImages();
  const list = document.getElementById('reviewList');
  list.innerHTML = '';
  try {
    const items = await request(`/admin/reviews?status=${state.status}`);
    document.getElementById('itemCount').textContent = String(items.length);
    document.getElementById('statusHint').textContent = hints[state.status];
    document.getElementById('emptyState').classList.toggle('hidden', items.length > 0);
    items.forEach((item) => list.appendChild(createCard(item)));
  } catch (error) {
    if (/token|access|expired|operator/i.test(error.message)) logout();
    else window.alert(error.message);
  }
}

function showWorkspace() {
  document.getElementById('loginPanel').classList.add('hidden');
  document.getElementById('workspace').classList.remove('hidden');
  loadReviews();
}

function logout() {
  state.token = '';
  sessionStorage.removeItem('adminToken');
  document.getElementById('workspace').classList.add('hidden');
  document.getElementById('loginPanel').classList.remove('hidden');
}

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorNode = document.getElementById('loginError');
  errorNode.textContent = '';
  try {
    await login(document.getElementById('password').value);
    document.getElementById('password').value = '';
    showWorkspace();
  } catch (error) {
    errorNode.textContent = error.message;
  }
});

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  state.status = tab.dataset.status;
  loadReviews();
}));
document.getElementById('refreshButton').addEventListener('click', loadReviews);
document.getElementById('logoutButton').addEventListener('click', logout);

if (state.token) showWorkspace();
