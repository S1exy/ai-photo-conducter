const api = require('../../services/api');

Page({
  data: {
    tasks: [],
  },

  async onShow() {
    this.refreshTasks();
    this.poller = setInterval(() => this.refreshTasks(), 1500);
  },

  onHide() {
    clearInterval(this.poller);
    this.poller = null;
  },

  onUnload() {
    clearInterval(this.poller);
  },

  onPullDownRefresh() {
    this.refreshTasks();
    wx.stopPullDownRefresh();
  },

  async refreshTasks() {
    try {
      const labels = {
        CREATED: '已创建', QUEUED: '等待生成', RUNNING: '生成中', RETRYING: '正在重试',
        SUCCEEDED: '已完成', FAILED: '生成失败', CANCELED: '已取消', EXPIRED: '已过期',
      };
      const tasks = (await api.getGenerations()).map((task) => ({
        ...task,
        displayImagePath: task.outputFilePath || task.inputFilePath,
        statusLabel: labels[task.status] || task.status,
      }));
      this.setData({ tasks });
    } catch (error) {
      wx.showToast({ title: error.message || '任务加载失败', icon: 'none' });
    }
  },
});
