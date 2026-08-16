const api = require('../../services/api');

Page({
  data: {
    nickname: '创作者 0286',
    stats: [
      { label: '作品', value: 0 },
      { label: '收藏', value: 0 },
      { label: '模板', value: 0 },
    ],
  },

  async onShow() {
    try {
      const user = await api.ensureLogin();
      const [creations, bookmarks] = await Promise.all([
        api.getCreations(),
        api.getBookmarks(),
      ]);
      this.setData({
        nickname: user.nickname,
        'stats[0].value': creations.length,
        'stats[1].value': bookmarks.works.length,
        'stats[2].value': bookmarks.templates.length,
      });
    } catch (error) {
      wx.showToast({ title: error.message || '个人信息加载失败', icon: 'none' });
    }
  },

  openWorks() {
    wx.navigateTo({ url: '/pages/works/index' });
  },

  openBookmarks() {
    wx.navigateTo({ url: '/pages/bookmarks/index' });
  },
});
