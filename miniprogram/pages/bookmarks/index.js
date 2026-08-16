const api = require('../../services/api');
Page({
  data: { works: [], templates: [], loading: true },
  async onShow() {
    try {
      const result = await api.getBookmarks();
      this.setData({ ...result, loading: false });
    } catch (error) {
      wx.showToast({ title: error.message || '收藏加载失败', icon: 'none' });
    }
  },
  openWork(event) { wx.navigateTo({ url: `/pages/work/detail?id=${event.currentTarget.dataset.id}` }); },
  openTemplate(event) { wx.navigateTo({ url: `/pages/template/detail?id=${event.currentTarget.dataset.id}` }); },
});
