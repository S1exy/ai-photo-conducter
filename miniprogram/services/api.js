function request({ url, method = 'GET', data, header = {} }) {
  const app = getApp();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}${url}`,
      method,
      data,
      header: {
        Authorization: app.globalData.token ? `Bearer ${app.globalData.token}` : '',
        ...header,
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.data);
        else reject(new Error(response.data && response.data.message ? response.data.message : '请求失败'));
      },
      fail: reject,
    });
  });
}

async function ensureLogin() {
  const app = getApp();
  if (app.globalData.token) return app.globalData.user;
  if (app.globalData.loginPromise) return app.globalData.loginPromise;

  app.globalData.loginPromise = (async () => {
    let code = 'dev-tourist';
    if (!app.globalData.useDevLogin) {
      const login = await wx.login();
      code = login.code;
    }
    const result = await request({ url: '/auth/wechat-login', method: 'POST', data: { code } });
    app.globalData.token = result.accessToken;
    app.globalData.user = result.user;
    wx.setStorageSync('accessToken', result.accessToken);
    return result.user;
  })();

  try {
    return await app.globalData.loginPromise;
  } finally {
    app.globalData.loginPromise = null;
  }
}

async function authorizedRequest(options) {
  await ensureLogin();
  return request(options);
}

function absoluteUrl(path) {
  if (!path || /^https?:\/\//.test(path)) return path;
  const app = getApp();
  return `${app.globalData.apiOrigin}${path}`;
}

module.exports = {
  ensureLogin,
  getTemplates() {
    return authorizedRequest({ url: '/templates' });
  },
  getTemplate(id) {
    return authorizedRequest({ url: `/templates/${id}` });
  },
  uploadImage(filePath) {
    return ensureLogin().then(() => new Promise((resolve, reject) => {
      const app = getApp();
      wx.uploadFile({
        url: `${app.globalData.apiBaseUrl}/assets/images`,
        filePath,
        name: 'file',
        header: { Authorization: `Bearer ${app.globalData.token}` },
        success(response) {
          let data;
          try { data = JSON.parse(response.data); } catch (error) { reject(error); return; }
          if (response.statusCode >= 200 && response.statusCode < 300) resolve(data);
          else reject(new Error(data.message || '图片上传失败'));
        },
        fail: reject,
      });
    }));
  },
  createGeneration(input) {
    return authorizedRequest({
      url: '/generations',
      method: 'POST',
      data: input,
      header: { 'Idempotency-Key': `miniapp-${Date.now()}-${Math.random().toString(16).slice(2)}` },
    });
  },
  async getGenerations() {
    const jobs = await authorizedRequest({ url: '/generations' });
    return jobs.map((job) => ({
      ...job,
      inputFilePath: absoluteUrl(job.inputFilePath),
      outputFilePath: absoluteUrl(job.outputFilePath),
    }));
  },
  async getCreations() {
    const creations = await authorizedRequest({ url: '/creations' });
    return creations.map((creation) => ({
      ...creation,
      outputFilePath: absoluteUrl(creation.outputFilePath),
    }));
  },
  submitPublication(creationId) {
    return authorizedRequest({ url: `/creations/${creationId}/publication`, method: 'POST' });
  },
  withdrawPublication(publicationId) {
    return authorizedRequest({ url: `/publications/${publicationId}/withdraw`, method: 'POST' });
  },
  async getFeed() {
    const works = await request({ url: '/publications/feed' });
    return works.map((work) => ({ ...work, imagePath: absoluteUrl(work.imagePath) }));
  },
  async getFeedBySort(sort) {
    const works = await request({ url: `/publications/feed?sort=${sort}` });
    return works.map((work) => ({ ...work, imagePath: absoluteUrl(work.imagePath) }));
  },
  async getPublication(id) {
    const work = await authorizedRequest({ url: `/publications/${id}` });
    return { ...work, imagePath: absoluteUrl(work.imagePath) };
  },
  likePublication(id, liked) {
    return authorizedRequest({ url: `/publications/${id}/like`, method: liked ? 'DELETE' : 'POST' });
  },
  bookmarkPublication(id, bookmarked) {
    return authorizedRequest({ url: `/publications/${id}/bookmark`, method: bookmarked ? 'DELETE' : 'POST' });
  },
  reportPublication(id, reasonCode) {
    return authorizedRequest({ url: `/publications/${id}/reports`, method: 'POST', data: { reasonCode } });
  },
  bookmarkTemplate(id, bookmarked) {
    return authorizedRequest({ url: `/templates/${id}/bookmark`, method: bookmarked ? 'DELETE' : 'POST' });
  },
  async getBookmarks() {
    const result = await authorizedRequest({ url: '/bookmarks' });
    return {
      works: result.works.map((work) => ({ ...work, imagePath: absoluteUrl(work.imagePath) })),
      templates: result.templates,
    };
  },
};
