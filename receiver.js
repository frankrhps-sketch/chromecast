const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

castDebugLogger.setEnabled(true);
castDebugLogger.showDebugLogs(true);

playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  loadRequestData => {
    castDebugLogger.info('Main', 'Intercepting LOAD');

    // FIX 1: Use the FULL URL to the JSON file
    return fetch('https://storage.googleapis.com')
      .then(response => response.json())
      .then(data => {
        const contentId = loadRequestData.media.contentId;
        
        // FIX 2: Correct path for Codelab JSON (categories[0].videos)
        const videoList = data.categories[0].videos; 
        const item = videoList.find(v => v.title === contentId);

        if (item) {
          castDebugLogger.info('Main', 'Found match: ' + item.title);
          // FIX 3: sources is an array; CAF needs a string
          loadRequestData.media.contentUrl = item.sources[0];
          loadRequestData.media.contentType = 'video/mp4';
        } else {
          castDebugLogger.warn('Main', 'No match for: ' + contentId + '. Using fallback.');
          // FALLBACK: Essential to prevent the blue screen freeze
          loadRequestData.media.contentUrl = 'https://commondatastorage.googleapis.com';
          loadRequestData.media.contentType = 'video/mp4';
        }

        return loadRequestData;
      })
      .catch(err => {
        castDebugLogger.error('Main', 'Fetch error: ' + JSON.stringify(err));
        // Final fallback to ensure the player starts
        loadRequestData.media.contentUrl = 'https://commondatastorage.googleapis.com';
        loadRequestData.media.contentType = 'video/mp4';
        return loadRequestData;
      });
  }
);

context.start();



