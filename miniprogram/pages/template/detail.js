const api = require('../../services/api');

Page({
  data: {
    template: null,
    bookmarked: false,
    loading: true,
  },

  async onLoad(options) {
    try {
      const [template, bookmarks] = await Promise.all([api.getTemplate(options.id), api.getBookmarks()]);
      this.setData({
        template,
        bookmarked: bookmarks.templates.some((item) => item.id === template.id),
        loading: false,
      });
    } catch (error) {
      wx.showToast({ title: error.message || '模板加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  useTemplate() {
    if (!this.data.template.generationEnabled) return;
    const app = getApp();
    app.globalData.selectedTemplate = this.data.template;
    wx.switchTab({ url: '/pages/create/index' });
  },

  async toggleBookmark() {
    await api.bookmarkTemplate(this.data.template.id, this.data.bookmarked);
    this.setData({ bookmarked: !this.data.bookmarked });
  },
});
