App({
  onLaunch() {
    console.log('Terminal initialized...');
  },
  globalData: {
    apiUrl: 'https://ding.calctextile.com/api/v1/sessions/main/send',
    uploadUrl: 'https://ding.calctextile.com/api/v1/files/upload' 
  }
})