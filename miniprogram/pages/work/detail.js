const api = require('../../services/api');

const reportReasons = [
  ['违法违规', 'ILLEGAL_CONTENT'], ['色情低俗', 'SEXUAL_CONTENT'],
  ['暴力危险', 'VIOLENCE_DANGER'], ['侵犯隐私', 'PRIVACY_RISK'],
  ['疑似侵权', 'COPYRIGHT_RISK'], ['令人不适', 'UNCOMFORTABLE'],
  ['其他平台规则原因', 'OTHER_PLATFORM_RULES'],
];

Page({
  data: { work: null, loading: true },

  async onLoad(options) {
    this.publicationId = options.id;
    await this.loadWork();
  },

  async loadWork() {
    try {
      this.setData({ work: await api.getPublication(this.publicationId), loading: false });
    } catch (error) {
      wx.showToast({ title: error.message || '作品加载失败', icon: 'none' });
    }
  },

  async toggleLike() {
    const { work } = this.data;
    await api.likePublication(work.id, work.liked);
    this.setData({ 'work.liked': !work.liked, 'work.likes': work.likes + (work.liked ? -1 : 1) });
  },

  async toggleBookmark() {
    const { work } = this.data;
    await api.bookmarkPublication(work.id, work.bookmarked);
    this.setData({ 'work.bookmarked': !work.bookmarked, 'work.bookmarks': work.bookmarks + (work.bookmarked ? -1 : 1) });
  },

  async useSame() {
    const { work } = this.data;
    if (!work.generationEnabled) {
      wx.showToast({ title: '模板暂不可生成', icon: 'none' });
      return;
    }
    const template = await api.getTemplate(work.templateId);
    getApp().globalData.selectedTemplate = template;
    getApp().globalData.sourcePublicationId = work.id;
    wx.switchTab({ url: '/pages/create/index' });
  },

  async report() {
    const selection = await wx.showActionSheet({ itemList: reportReasons.map(([label]) => label) });
    const reasonCode = reportReasons[selection.tapIndex][1];
    await api.reportPublication(this.data.work.id, reasonCode);
    wx.showToast({ title: '举报已提交', icon: 'success' });
  },

  onShareAppMessage() {
    const { work } = this.data;
    return {
      title: `${work.author} 使用「${work.templateName}」模板创作了一张图片`,
      path: `/pages/work/detail?id=${work.id}`,
      imageUrl: work.imagePath,
    };
  },
});
