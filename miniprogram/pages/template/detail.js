const api = require('../../services/api');

Page({
  data: {
    template: null,
    loading: true,
  },

  async onLoad(options) {
    try {
      const template = await api.getTemplate(options.id);
      this.setData({ template, loading: false });
    } catch (error) {
      wx.showToast({ title: error.message || '模板加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  useTemplate() {
    const app = getApp();
    app.globalData.selectedTemplate = this.data.template;
    wx.switchTab({ url: '/pages/create/index' });
  },
});
