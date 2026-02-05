const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

castDebugLogger.setEnabled(true);
castDebugLogger.showDebugLogs(true);

playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  loadRequestData => {
    castDebugLogger.info('Main', 'Intercepting LOAD');

    // Step 9: Fetch with a 5-second timeout to prevent "Blue Screen Freeze"
    return Promise.race([
      fetch('https://storage.googleapis.com')
        .then(response => response.json())
        .then(data => {
          const contentId = loadRequestData.media.contentId;
          // Step 9 JSON path: data.categories[0].videos
          const videoList = data.categories[0].videos;
          const item = videoList.find(v => v.title === contentId);

          if (item) {
            castDebugLogger.info('Main', 'Found: ' + item.title);
            loadRequestData.media.contentUrl = item.sources[0];
            loadRequestData.media.contentType = 'video/mp4';
          }
          return loadRequestData;
        }),
      new Promise((_, reject) => setTimeout(() => reject('Timeout'), 5000))
    ])
    .catch(err => {
      castDebugLogger.warn('Main', 'Fetch failed or timed out. Forcing fallback video.');
      // ULTIMATE FALLBACK: This URL is guaranteed to work
      loadRequestData.media.contentUrl = 'https://commondatastorage.googleapis.com';
      loadRequestData.media.contentType = 'video/mp4';
      return loadRequestData;
    });
  }
);

context.start();



