App({
  onLaunch() {
    console.log('Terminal initialized...');
  },
  globalData: {
    apiUrl: 'https://ding.calctextile.com/v1/chat/completions',
    uploadUrl: 'https://ding.calctextile.com/api/v1/files/upload' 
  }
})