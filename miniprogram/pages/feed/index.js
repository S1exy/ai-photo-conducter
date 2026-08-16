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
      const sort = this.data.activeTab === '最新' ? 'latest' : 'recommended';
      const works = (await api.getFeedBySort(sort)).map((work, index) => ({
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
    if (event.currentTarget.dataset.tab !== '模板') this.loadFeed();
  },

  openTemplate(event) {
    wx.navigateTo({
      url: `/pages/work/detail?id=${event.currentTarget.dataset.publicationId}`,
    });
  },
});
