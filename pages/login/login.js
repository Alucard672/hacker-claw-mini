const app = getApp();

Page({
  data: {
    canIUse: wx.canIUse('button.open-type.getPhoneNumber')
  },

  onLoad() {
    // 检查是否已经登录
    const phone = wx.getStorageSync('user_phone');
    if (phone) {
      wx.reLaunch({ url: '../index/index' });
    }
  },

  getPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      const { code, encryptedData, iv } = e.detail;
      
      wx.showLoading({ title: 'AUTHENTICATING...' });

      // 这里先模拟登录成功，因为解密需要后端配合
      // 在实际生产中，你会把 code 发给后端换取手机号
      setTimeout(() => {
        // 假设获取到了手机号（实际从后端返回）
        const mockPhone = '138****8888'; 
        wx.setStorageSync('user_phone', mockPhone);
        
        // 用手机号作为 sessionKey 的一部分，实现多端同步
        wx.setStorageSync('claw_session_key', `user-${mockPhone}`);
        app.globalData.sessionKey = `user-${mockPhone}`;

        wx.hideLoading();
        wx.reLaunch({ url: '../index/index' });
      }, 1500);
    } else {
      wx.showToast({ title: 'Login Required', icon: 'none' });
    }
  }
});