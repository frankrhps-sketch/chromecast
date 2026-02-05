const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

castDebugLogger.setEnabled(true);
castDebugLogger.showDebugLogs(true);

playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  loadRequestData => {
    castDebugLogger.info('Main', 'Intercepting LOAD');

    return fetch('https://storage.googleapis.com')
      .then(response => response.json())
      .then(data => {
        const contentId = loadRequestData.media.contentId;
        // Search the nested JSON structure
        const videoList = data.categories[0].videos; 
        const item = videoList.find(v => v.title === contentId);

        if (item) {
          castDebugLogger.info('Main', 'Found match: ' + item.title);
          // FIX: sources is an array, take the first element
          loadRequestData.media.contentUrl = item.sources[0];
          loadRequestData.media.contentType = 'video/mp4';
        } else {
          castDebugLogger.warn('Main', 'No match for: ' + contentId + '. Using fallback.');
          // FALLBACK: If lookup fails, manually set a working URL to stop the spinning
          loadRequestData.media.contentUrl = 'https://commondatastorage.googleapis.com';
          loadRequestData.media.contentType = 'video/mp4';
        }

        return loadRequestData;
      })
      .catch(err => {
        castDebugLogger.error('Main', 'Fetch error, playing fallback');
        // Final safety fallback
        loadRequestData.media.contentUrl = 'https://commondatastorage.googleapis.com';
        return loadRequestData;
      });
  }
);

context.start();





