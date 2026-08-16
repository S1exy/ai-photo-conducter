const api = require('../../services/api');

Page({
  data: {
    tabs: ['推荐', '最新', '模板'],
    activeTab: '推荐',
    loading: true,
    works: [],
  },

  onLoad() {
    this.loadFeed();
  },

  onPullDownRefresh() {
    this.loadFeed().finally(() => wx.stopPullDownRefresh());
  },

  async loadFeed() {
    this.setData({ loading: true });
    try {
      const heights = ['tall', 'short', 'medium'];
      const works = (await api.getFeed()).map((work, index) => ({
        ...work,
        heightClass: heights[index % heights.length],
      }));
      this.setData({ works, loading: false });
    } catch (error) {
      this.setData({ works: [], loading: false });
      wx.showToast({ title: error.message || '作品加载失败', icon: 'none' });
    }
  },

  selectTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.tab });
  },

  openTemplate(event) {
    wx.navigateTo({
      url: `/pages/template/detail?id=${event.currentTarget.dataset.templateId}`,
    });
  },
});
