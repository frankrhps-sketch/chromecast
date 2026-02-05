const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

/**
 * Enable Debug Logger to show on-screen logs on the TV.
 */
castDebugLogger.setEnabled(true);
castDebugLogger.showDebugLogs(true);

/**
 * Helper function to make XHR requests to the external content API.
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

/**
 * Intercept the LOAD request to map content IDs (like 'fbb_ad')
 * to actual stream URLs and metadata.
 */
playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    request => {
        return new Promise((resolve, reject) => {
            // Note: Use the full URL for the JSON API
            makeRequest('GET', 'https://storage.googleapis.com/cpe-sample-media/content.json')
                .then(function (data) {
                    // Identify content by entity ID or contentId
                    let contentId = request.media.entity || request.media.contentId || 'fbb_ad';
                    let item = data[contentId];

                    if (!item) {
                        castDebugLogger.error('Main', 'Content not found for ID: ' + contentId);
                        reject("Content not found");
                    } else {
                        let metadata = new cast.framework.messages.GenericMediaMetadata();
                        metadata.title = item.title;
                        metadata.subtitle = item.author;
                        request.media.metadata = metadata;

                        // CRITICAL: Configure for fMP4 HLS to prevent the screen blinking
                        request.media.contentUrl = item.stream.hls;
                        request.media.contentType = 'application/x-mpegurl';
                        request.media.hlsSegmentFormat = cast.framework.messages.HlsSegmentFormat.FMP4;
                        request.media.hlsVideoSegmentFormat = cast.framework.messages.HlsVideoSegmentFormat.FMP4;

                        resolve(request);
                    }
                })
                .catch(err => {
                    castDebugLogger.error('Main', 'API Request Failed');
                    reject(err);
                });
        });
    }
);

/**
 * UI Controls and Browse Content logic for Step 11.
 */
const touchControls = cast.framework.ui.Controls.getInstance();
const playerData = new cast.framework.ui.PlayerData();
const playerDataBinder = new cast.framework.ui.PlayerDataBinder(playerData);
let browseContent = new cast.framework.ui.BrowseContent();

function updateBrowseItems() {
    makeRequest('GET', 'https://storage.googleapis.com/cpe-sample-media/content.json')
        .then(function (data) {
            let items = [];
            for (let key in data) {
                let item = new cast.framework.ui.BrowseItem();
                item.entity = key;
                item.title = data[key].title;
                item.subtitle = data[key].description;
                item.image = new cast.framework.messages.Image(data[key].poster);
                item.imageType = cast.framework.ui.BrowseImageType.MOVIE;
                items.push(item);
            }
            browseContent.items = items;
        });
}

browseContent.title = 'Up Next';
browseContent.targetAspectRatio = cast.framework.ui.BrowseImageAspectRatio.LANDSCAPE_16_TO_9;
updateBrowseItems();

playerDataBinder.addEventListener(
    cast.framework.ui.PlayerDataEventType.MEDIA_CHANGED,
    (e) => {
        if (!e.value) return;
        touchControls.setBrowseContent(browseContent);
    });

touchControls.clearDefaultSlotAssignments();
touchControls.assignButton(
    cast.framework.ui.ControlsSlot.SLOT_PRIMARY_1,
    cast.framework.ui.ControlsButton.SEEK_BACKWARD_30
);

/**
 * Initialize the receiver session.
 */
const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;
// Shaka player improves HLS stability for codelab assets
options.useShakaForHls = true; 

context.start(options);



