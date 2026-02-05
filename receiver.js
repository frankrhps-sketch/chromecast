const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

// Enable logs on TV so you can see errors
castDebugLogger.setEnabled(true);
castDebugLogger.showDebugLogs(true);

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

playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    request => {
        return new Promise((resolve, reject) => {
            // FIX: Ensure the URL is the full path to the JSON
            makeRequest('GET', 'https://storage.googleapis.com')
                .then(function (data) {
                    // FIX: If contentId is missing, default to 'fbb_ad'
                    let contentId = request.media.contentId || 'fbb_ad';
                    let item = data[contentId];

                    if (!item) {
                        castDebugLogger.error('Main', 'Content not found: ' + contentId);
                        reject("Content not found");
                    } else {
                        let metadata = new cast.framework.messages.GenericMediaMetadata();
                        metadata.title = item.title;
                        metadata.subtitle = item.author;
                        request.media.metadata = metadata;

                        // THE "BLINK" FIX: Set fMP4 for HLS
                        request.media.contentUrl = item.stream.hls;
                        request.media.contentType = 'application/x-mpegurl';
                        request.media.hlsSegmentFormat = cast.framework.messages.HlsSegmentFormat.FMP4;
                        request.media.hlsVideoSegmentFormat = cast.framework.messages.HlsVideoSegmentFormat.FMP4;

                        resolve(request);
                    }
                })
                .catch(err => {
                    castDebugLogger.error('Main', 'XHR Failed');
                    reject(err);
                });
        });
    }
);

const options = new cast.framework.CastReceiverOptions();
options.useShakaForHls = true; // Essential for fbb_ad

context.start(options);



