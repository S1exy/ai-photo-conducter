App({
  onLaunch() {
    this.globalData.token = wx.getStorageSync('accessToken') || '';
  },

  globalData: {
    apiOrigin: 'http://127.0.0.1:3000',
    apiBaseUrl: 'http://127.0.0.1:3000/api/v1',
    useDevLogin: true,
    token: '',
    user: null,
    loginPromise: null,
    selectedTemplate: null,
  },
});
