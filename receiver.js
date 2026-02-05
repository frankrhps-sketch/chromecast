const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

// Enable logs on TV so you can see errors
castDebugLogger.setEnabled(true);
castDebugLogger.showDebugLogs(true);

/**
 * Helper to fetch external metadata
 */
function makeRequest(method, url) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject({ status: this.status, statusText: xhr.statusText });
            }
        };
        xhr.onerror = function () {
            reject({ status: this.status, statusText: xhr.statusText });
        };
        xhr.send();
    });
}

// Step 9: Intercept the LOAD request
playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    request => {
        return new Promise((resolve, reject) => {
            // FIX 1: Use the full URL to the sample media JSON
            makeRequest('GET', 'https://storage.googleapis.com')
                .then(function (data) {
                    // FIX 2: Navigate the JSON structure (categories -> videos)
                    const contentId = request.media.contentId;
                    const videoList = data.categories[0].videos; // The codelab JSON structure
                    const item = videoList.find(v => v.title === contentId);

                    if (!item) {
                        castDebugLogger.error('Main', 'Content not found: ' + contentId);
                        // If not found, we resolve the original request to try playing as-is
                        resolve(request);
                    } else {
                        // Create Metadata
                        let metadata = new cast.framework.messages.GenericMediaMetadata();
                        metadata.title = item.title;
                        metadata.subtitle = item.subtitle || item.studio;
                        request.media.metadata = metadata;

                        // FIX 3: Assign the stream URL and type correctly
                        // Note: Codelab assets are mp4, but keeping your HLS logic structure
                        request.media.contentUrl = item.sources[0]; 
                        request.media.contentType = 'video/mp4'; 
                        
                        // If you are specifically testing HLS/fMP4 assets:
                        if (request.media.contentUrl.includes('m3u8')) {
                            request.media.contentType = 'application/x-mpegurl';
                            request.media.hlsSegmentFormat = cast.framework.messages.HlsSegmentFormat.FMP4;
                            request.media.hlsVideoSegmentFormat = cast.framework.messages.HlsVideoSegmentFormat.FMP4;
                        }

                        castDebugLogger.info('Main', 'Loading: ' + metadata.title);
                        resolve(request);
                    }
                })
                .catch(err => {
                    castDebugLogger.error('Main', 'Fetch Failed: ' + JSON.stringify(err));
                    reject(err);
                });
        });
    }
);

const options = new cast.framework.CastReceiverOptions();

// Step 9: Often requires Shaka for advanced HLS handling
options.useShakaForHls = true; 

context.start(options);




