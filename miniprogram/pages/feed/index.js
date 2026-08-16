const mock = require('../../services/mock');

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
    const works = await mock.getFeed();
    this.setData({ works, loading: false });
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
