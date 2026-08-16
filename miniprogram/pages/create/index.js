const api = require('../../services/api');

Page({
  data: {
    template: null,
    templates: [],
    selectedImagePath: '',
    selectedRatio: '',
    submitting: false,
  },

  async onShow() {
    try {
      const app = getApp();
      const templates = await api.getTemplates();
      const selectedId = app.globalData.selectedTemplate && app.globalData.selectedTemplate.id;
      const template = templates.find((item) => item.id === selectedId) || templates[0];
      this.setData({
        templates,
        template,
        selectedRatio: template ? template.ratios[0] : '',
      });
    } catch (error) {
      wx.showToast({ title: error.message || '模板加载失败', icon: 'none' });
    }
  },

  chooseTemplate(event) {
    const template = this.data.templates.find((item) => item.id === event.currentTarget.dataset.id);
    this.setData({ template, selectedRatio: template.ratios[0] });
  },

  async chooseImage() {
    const result = await wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] });
    this.setData({ selectedImagePath: result.tempFiles[0].tempFilePath });
  },

  chooseRatio(event) {
    this.setData({ selectedRatio: event.currentTarget.dataset.ratio });
  },

  async submitGeneration() {
    if (!this.data.selectedImagePath) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '正在提交' });
    try {
      const asset = await api.uploadImage(this.data.selectedImagePath);
      await api.createGeneration({
        templateVersionId: this.data.template.versionId,
        inputAssetId: asset.id,
        aspectRatio: this.data.selectedRatio,
      });
      wx.switchTab({ url: '/pages/tasks/index' });
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  },
});
