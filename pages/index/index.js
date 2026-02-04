const app = getApp();

Page({
  data: {
    messages: [
      { id: 'm0', time: '01:22', type: 'system', text: '连接已建立，系统在线。' }
    ],
    inputValue: '',
    lastMessageId: 'm0',
    isTyping: false
  },

  onLoad() {
    let sessionKey = wx.getStorageSync('claw_session_key');
    if (!sessionKey) {
      sessionKey = `wx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      wx.setStorageSync('claw_session_key', sessionKey);
    }
    app.globalData.sessionKey = sessionKey;
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
        this.addMessage('user', `正在发送文件：${file.name}`, { file: file.path, fileName: file.name });
        this.uploadFile(file.path, 'file');
      }
    });
  },

  // 语音输入
  startVoice() {
    this.recorder = wx.getRecorderManager();
    this.recorder.start({ format: 'mp3' });
    wx.showToast({ title: '正在录音...', icon: 'none' });
  },

  stopVoice() {
    this.recorder.stop();
    this.recorder.onStop((res) => {
      this.addMessage('user', '发送了一条语音消息。');
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
        let msg = '文件已接收并处理。';
        try {
          // wx.uploadFile 返回的是字符串，需要 JSON.parse
          const data = JSON.parse(res.data);
          msg = data.reply || data.message || msg;
        } catch(e) {}
        
        this.addMessage('system', msg);
      },
      fail: (err) => {
        this.addMessage('system', `错误：上传失败 (${err.errMsg})`);
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

    // 这里是调用 OpenClaw 的逻辑
    const requestUrl = app.globalData.apiUrl;
    const requestData = {
      message: text,
      sessionKey: app.globalData.sessionKey || ''
    };
    console.log('[发送消息] URL:', requestUrl);
    console.log('[发送消息] 请求体:', JSON.stringify(requestData));

    const requestTask = wx.request({
      url: requestUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: requestData,
      success: (res) => {
        console.log('[发送消息] 响应:', res.statusCode, res.data);
        // 增加对不同返回格式的兼容处理
        let replyText = '命令已执行。';
        if (res.data) {
          replyText = res.data.reply || res.data.message || (typeof res.data === 'string' ? res.data : replyText);
        }
        
        this.addMessage('system', replyText);
      },
      fail: (err) => {
        console.error('[发送消息] 请求失败:', err);
        this.addMessage('system', `错误：请求失败 (${err.errMsg || '未知错误'})`);
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
})
