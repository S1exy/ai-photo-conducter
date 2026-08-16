const api = require('../../services/api');

const labels = {
  PRIVATE: '私人草稿',
  PENDING_REVIEW: '等待审核',
  PUBLISHED: '已公开',
  REJECTED: '未通过',
  WITHDRAWN: '已撤回',
  REMOVED: '平台已下架',
};

Page({
  data: { creations: [], loading: true, submittingId: '' },

  onShow() {
    this.loadCreations();
  },

  onPullDownRefresh() {
    this.loadCreations().finally(() => wx.stopPullDownRefresh());
  },

  async loadCreations() {
    this.setData({ loading: true });
    try {
      const creations = (await api.getCreations()).map((creation) => {
        const status = creation.publication ? creation.publication.status : 'PRIVATE';
        return {
          ...creation,
          status,
          statusLabel: labels[status] || status,
          canPublish: !creation.publication,
          canWithdraw: ['PENDING_REVIEW', 'PUBLISHED'].includes(status),
        };
      });
      this.setData({ creations, loading: false });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || '作品加载失败', icon: 'none' });
    }
  },

  async publish(event) {
    const id = event.currentTarget.dataset.id;
    const confirmed = await wx.showModal({
      title: '确认公开这张作品？',
      content: '审核通过后，其他用户可以喜欢、收藏、分享并使用同款模板。',
      confirmText: '提交审核',
    });
    if (!confirmed.confirm) return;
    this.setData({ submittingId: id });
    try {
      await api.submitPublication(id);
      wx.showToast({ title: '已提交审核', icon: 'success' });
      await this.loadCreations();
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submittingId: '' });
    }
  },

  async withdraw(event) {
    const id = event.currentTarget.dataset.id;
    const confirmed = await wx.showModal({
      title: '停止公开？',
      content: '作品会从公开流移除，但仍保留为私人作品。',
      confirmText: '确认撤回',
    });
    if (!confirmed.confirm) return;
    try {
      await api.withdrawPublication(id);
      await this.loadCreations();
    } catch (error) {
      wx.showToast({ title: error.message || '撤回失败', icon: 'none' });
    }
  },
});
