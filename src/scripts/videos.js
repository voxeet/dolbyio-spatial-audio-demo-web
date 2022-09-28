VoxeetSDK.conference.on('streamAdded', (participant, stream) => {
    if (stream && stream.getVideoTracks().length) {
        // Only add the video node if there is a video track
        addVideoNode(participant, stream);
    }
});

VoxeetSDK.conference.on('streamUpdated', (participant, stream) => {
    if (stream && stream.getVideoTracks().length) {
        // Only add the video node if there is a video track
        addVideoNode(participant, stream);
    } else {
        removeVideoNode(participant);
    }
});

VoxeetSDK.conference.on('streamRemoved', (participant, stream) => {
    removeVideoNode(participant);
});

/**
 * Add a video stream to the web page
 */
const addVideoNode = (participant, stream) => {
    let videoNode = document.getElementById(`video-${participant.id}`);

    if (!videoNode) {
        videoNode = VoxeetSDKExt.conference.attachMediaStreamToHTMLVideoElement(participant);

        videoNode.setAttribute('id', `video-${participant.id}`);

        // Add the video element to the container
        const videoContainer = $(`#user-${participant.id}-container .video-container`);
        videoContainer.empty(); // Remove all children
        videoContainer.append(videoNode);
    }

    navigator.attachMediaStream(videoNode, stream);
};

/**
 * Remove the video stream from the web page
 */
const removeVideoNode = (participant) => {
    const videoNode = document.getElementById(`video-${participant.id}`);

    if (videoNode) {
        videoNode.srcObject = null; // Prevent memory leak in Chrome
        const parentNode = videoNode.parentNode;
        parentNode.removeChild(videoNode);

        const img = document.createElement('img');
        img.src = participant.info.avatarUrl;
        parentNode.appendChild(img)
    }
};
