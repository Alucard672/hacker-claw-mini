const app = getApp();

Page({
  data: {
    messages: [
      { id: 'm0', time: '01:22', type: 'system', text: 'CONNECTION ESTABLISHED. SYSTEM ONLINE.' }
    ],
    inputValue: '',
    lastMessageId: 'm0',
    isTyping: false
  },

  onLoad() {
    const phone = wx.getStorageSync('user_phone');
    if (!phone) {
      wx.reLaunch({ url: '../login/login' });
      return;
    }
    this.setData({ userPhone: phone });

    let sessionKey = wx.getStorageSync('claw_session_key');
    if (!sessionKey) {
      sessionKey = `user-${phone}`;
      wx.setStorageSync('claw_session_key', sessionKey);
    }
    app.globalData.sessionKey = sessionKey;
    
    // 拉取历史记录
    this.fetchHistory();
  },

  fetchHistory() {
    wx.request({
      url: `${app.globalData.apiUrl.replace('/wechat', '')}/api/v1/sessions/history`,
      method: 'GET',
      data: {
        sessionKey: app.globalData.sessionKey,
        limit: 20
      },
      header: {
        'Authorization': 'Bearer 888888'
      },
      success: (res) => {
        if (res.data && res.data.data) {
          // 将 OpenClaw 历史记录转换为小程序格式
          const history = res.data.data.map(m => ({
            id: m.id,
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: m.role === 'user' ? 'user' : 'system',
            text: m.content
          })).reverse();
          
          if (history.length > 0) {
            this.setData({ messages: history, lastMessageId: history[history.length-1].id });
          }
        }
      }
    });
  },

  logout() {
    wx.clearStorageSync();
    wx.reLaunch({ url: '../login/login' });
  },

  // 选择并上传图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath;
        this.addMessage('user', '', { image: path });
        this.uploadFile(path, 'image');
      }
    });
  },

  // 选择并上传文件 (PDF/DOC等)
  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const file = res.tempFiles[0];
        this.addMessage('user', `Sending file: ${file.name}`, { file: file.path, fileName: file.name });
        this.uploadFile(file.path, 'file');
      }
    });
  },

  // 语音输入
  startVoice() {
    this.recorder = wx.getRecorderManager();
    this.recorder.start({ format: 'mp3' });
    wx.showToast({ title: 'RECORDING...', icon: 'none' });
  },

  stopVoice() {
    this.recorder.stop();
    this.recorder.onStop((res) => {
      this.addMessage('user', 'Sent a voice message.');
      this.uploadFile(res.tempFilePath, 'audio');
    });
  },

  uploadFile(path, type) {
    this.setData({ isTyping: true });
    wx.uploadFile({
      url: app.globalData.uploadUrl,
      filePath: path,
      name: 'file',
      formData: { type: type, sessionKey: app.globalData.sessionKey || '' },
      success: (res) => {
        let msg = 'FILE RECEIVED AND PROCESSED.';
        try {
          const data = JSON.parse(res.data);
          msg = data.reply || data.message || msg;
        } catch (e) {}
        this.addMessage('system', msg);
      },
      fail: (err) => {
        this.addMessage('system', `ERROR: UPLOAD FAILED (${err.errMsg})`);
      },
      complete: () => {
        this.setData({ isTyping: false });
      }
    });
  },

  addMessage(type, text, extra = {}) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const id = type[0] + Date.now() + Math.floor(Math.random() * 1000);
    this.setData({
      messages: [...this.data.messages, { id, time: timestamp, type, text, ...extra }],
      lastMessageId: id
    });
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  sendMessage() {
    const text = this.data.inputValue.trim();
    if (!text) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = 'u' + Date.now() + Math.floor(Math.random() * 1000);

    const newMessages = [...this.data.messages, {
      id: userMsgId,
      time: timestamp,
      type: 'user',
      text: text
    }];

    this.setData({
      messages: newMessages,
      inputValue: '',
      lastMessageId: userMsgId,
      isTyping: true
    });

    wx.request({
      url: app.globalData.apiUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        model: 'openclaw:main',
        messages: [{ role: 'user', content: text }],
        user: app.globalData.sessionKey || ''
      },
      success: (res) => {
        let replyText = 'COMMAND EXECUTED.';
        if (res.data) {
          replyText =
            res.data.reply ||
            res.data.message ||
            (typeof res.data === 'string' ? res.data : replyText);
        }
        this.addMessage('system', replyText);
      },
      fail: (err) => {
        console.error('Uplink error:', err);
        this.addMessage('system', `ERROR: UPLINK FAILED (${err.errMsg || 'UNKNOWN_ERROR'})`);
      },
      complete: () => {
        this.setData({ isTyping: false });
      }
    });
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;
    wx.previewImage({ urls: [src] });
  },

  openFile(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.openDocument({ filePath: url, showMenu: true });
  }
});
