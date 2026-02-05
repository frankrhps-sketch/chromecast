const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

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
        xhr.onerror = () => reject({ status: xhr.status });
        xhr.send();
    });
}

playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    request => {
        castDebugLogger.info('Main', 'Intercepting LOAD request');
        
        return new Promise((resolve, reject) => {
            makeRequest('GET', 'https://storage.googleapis.com')
                .then(function (data) {
                    const contentId = request.media.contentId;
                    // The Codelab JSON structure: data.categories[0].videos
                    const videoList = data.categories[0].videos; 
                    const item = videoList.find(v => v.title === contentId);

                    if (!item) {
                        castDebugLogger.error('Main', 'Content not found in JSON: ' + contentId);
                        resolve(request); // Fallback: try playing original request
                    } else {
                        let metadata = new cast.framework.messages.GenericMediaMetadata();
                        metadata.title = item.title;
                        metadata.subtitle = item.subtitle || item.studio;
                        request.media.metadata = metadata;

                        // FIX: item.sources is an ARRAY (e.g. ["http://..."]). 
                        // We must grab the first string [0]
                        const sourceUrl = Array.isArray(item.sources) ? item.sources[0] : item.sources;
                        
                        request.media.contentUrl = sourceUrl;
                        request.media.contentType = 'video/mp4'; 

                        castDebugLogger.info('Main', 'Resolved URL: ' + request.media.contentUrl);
                        resolve(request);
                    }
                })
                .catch(err => {
                    castDebugLogger.error('Main', 'Fetch Failed, playing original');
                    resolve(request); // Resolve anyway so the player doesn't hang forever
                });
        });
    }
);

const options = new cast.framework.CastReceiverOptions();
options.useShakaForHls = true;

context.start(options);





