if (window.electron) {
    // Inform the Electron process
    VoxeetSDK.conference.on("joined", () => window.electron.electronOnJoined());
    VoxeetSDK.conference.on("left", () => window.electron.electronOnLeft());
}

VoxeetSDK.conference.on('participantAdded', (participant) => {
    // Only add connected participants
    if (!isConnected(participant)) return;

    addParticipant(participant);

    var message = `${participant.info.name ?? 'someone'} has joined the conference.`;
    if (participant.info.avatarUrl !== null) {
        message = `<img class="avatar" src="${participant.info.avatarUrl}" /> ${message}`;
    }
    showToast('Participant', message);
});

VoxeetSDK.conference.on('participantUpdated', (participant) => {
    // Look for the video container element in the DOM
    const container = document.getElementById(`user-${participant.id}-container`);

    if (isConnected(participant)) {
        if (!container) {
            addParticipant(participant);
        }

        $(`#user-${participant.id}-container .participant-name`).html(participant.info.name);
        setSpatialPosition(participant);
    } else if (container) {
        container.remove();

        var message = `${participant.info.name ?? 'someone'} has left the conference.`;
        if (participant.info.avatarUrl !== null) {
            message = `<img class="avatar" src="${participant.info.avatarUrl}" /> ${message}`;
        }
        showToast('Participant', message);
    }
});

/**
 * Adds a participant to the layout.
 * @param participant Participant object.
 */
const addParticipant = (participant) => {
    const person = {
        color: getRandomIsSpeakingColor(),
        participantId: participant.id,
        avatarUrl: participant.info.avatarUrl,
        name: participant.info.name,
    };

    const element = $($('#user-template').render(person));
    $('#users-container').append(element);
    const clientRect = element[0].getBoundingClientRect();

    // TODO: Find an empty space in the canvas
    const top = (window.innerHeight - clientRect.height ) / 2;
    const left = (window.innerWidth - clientRect.width ) / 2;
    element.attr('style', `top: ${top}px; left: ${left}px;`);

    // Allow to drag & drop the element
    element.draggable({
        containment: 'parent',
        delay: 100,
        stop: async () => {
            setSpatialPosition(participant);
            await controlUpdatePosition(participant);
        }
    });
};

/**
 * Set the spatial scene.
 */
const setSpatialEnvironment = () => {
    const right   = { x: 1, y: 0,  z: 0 };
    const forward = { x: 0, y: -1, z: 0 };
    const up      = { x: 0, y: 0,  z: 1 };
    const scale   = { x: window.innerWidth / 1, y: window.innerHeight / 1, z: 1 };

    VoxeetSDK.conference.setSpatialEnvironment(scale, forward, up, right);
};

/**
 * Set the position in the spatial scene for the specified participant.
 * @param participant Participant to position on the spatial scene.
 */
const setSpatialPosition = (participant) => {
    if (!isConnected(participant)) return;

    // Look for the participant element
    const container = document.getElementById(`user-${participant.id}-container`);
    if (!container) return;

    // Get the position of the UI element
    const elementPosition = container.getBoundingClientRect();

    // Get the position of the center of the UI element
    const spatialPosition = {
        x: elementPosition.left + (elementPosition.width / 2),
        y: elementPosition.top + (elementPosition.height / 2),
        z: 0,
    };

    console.log(`Set Spatial Position for ${participant.id}`, spatialPosition);
    VoxeetSDK.conference.setSpatialPosition(participant, spatialPosition);
};

var lockResizeEvent = false;
var documentHeight;
var documentWidth;

/**
 * Triggered when resizing the window.
 * The event will be processed with a maximum rate of once per second.
 */
const onWindowResize = () => {
    // Make sure the event processing is not "locked"
    if (lockResizeEvent) return;
    lockResizeEvent = true;

    // Use the setTimeout to wait a second before we process the resize event
    setTimeout(() => {
        lockResizeEvent = false;

        // Re-set the spatial audio scene dimensions
        setSpatialEnvironment();

        // For each participant, we need to update the spatial position
        [...VoxeetSDK.conference.participants].map((val) => {
            const participant = val[1];
            const container = document.getElementById(`user-${participant.id}-container`);
            if (container) {
                // Get the dimensions of the rectangle
                const clientRect = container.getBoundingClientRect();
        
                // Compute the new position
                const top = clientRect.top * document.documentElement.clientHeight / documentHeight;
                const left = clientRect.left * document.documentElement.clientWidth / documentWidth;
        
                // Animate the UI element to its new position
                $(container).animate({ top: `${top}px`, left: `${left}px` }, 500);
            
                setSpatialPosition(participant);
            }
        });
        
        documentHeight = document.documentElement.clientHeight;
        documentWidth = document.documentElement.clientWidth;
    }, 1000);
};

$('#btn-join').click(async () => {
    try {
        var name = $('#input-username').val();
        const avatarUrl = getRandomAvatar();

        // Open a session for the user
        await VoxeetSDK.session.open({ name, avatarUrl });

        console.group('Session opened');
        console.log(`Name:        ${name}`);
        console.log(`Avatar URL:  ${avatarUrl}`);
        console.groupEnd();

        // Hide the modal popup
        const modalElement = document.getElementById('login-modal');
        const bootstrapModal = bootstrap.Modal.getInstance(modalElement);
        bootstrapModal.hide();

        // See: https://docs.dolby.io/communications-apis/docs/js-client-sdk-model-conferenceoptions
        const conferenceOptions = {
            alias: $('#input-conference-alias').val(),
            // See: https://docs.dolby.io/communications-apis/docs/js-client-sdk-model-conferenceparameters
            params: {
                liveRecording: false,
                rtcpMode: "average", // worst, average, max
                ttl: 0,
                videoCodec: "H264", // H264, VP8
                dolbyVoice: true
            }
        };

        // Create the conference
        const conference = await VoxeetSDK.conference.create(conferenceOptions);

        console.group('Conference created');
        console.log(`Id:    ${conference.id}`);
        console.log(`Alias: ${conference.alias}`);
        console.groupEnd();

        // https://docs.dolby.io/communications-apis/docs/js-client-sdk-model-joinoptions
        const joinOptions = {
            constraints: {
                audio: true,
                video: false
            },
            preferRecvMono: false,
            preferSendMono: false,
            spatialAudio: true // Turn on Spatial Audio
        };

        // Join the conference
        await VoxeetSDK.conference.join(conference, joinOptions);

        // Set the spatial audio scene
        setSpatialEnvironment();

        // Load the Audio Video devices in case the user
        // wants to change device
        await loadAudioVideoDevices();

        // Start listening to who is speaking
        // to add a visual indication on the UI
        listenIsSpeaking();

        if (!window.electron) {
            // Display the actions buttons
            $(joinOptions.constraints.audio ? '#btn-mute' : '#btn-unmute').removeClass('d-none');
            $(joinOptions.constraints.video ? '#btn-video-off' : '#btn-video-on').removeClass('d-none');

            // Display the setting button on web browsers
            $('#btn-settings').removeClass('visually-hidden');
        }

        window.addEventListener('resize', onWindowResize);
    } catch (error) {
        console.error(error);
    }
});

/**
 * Requests an access token from the server.
 * @returns Access token.
 */
const getAccessToken = async () => {
    const url = 'http://localhost:8081/access-token';
    const response = await fetch(url);
    const jwt = await response.json();
    return jwt.access_token;
};

$(function() {
    getAccessToken()
        // Initialize the SDK
        .then(accessToken => VoxeetSDK.initializeToken(accessToken, getAccessToken))
        .then(() => {
            // Display a modal box to prompt for a username and a conference alias
            const modalElement = document.getElementById('login-modal');
            const bootstrapModal = new bootstrap.Modal(modalElement, {
                backdrop: 'static',
                keyboard: false,
                focus: true
            });
            bootstrapModal.show();
        })
        .catch((error) => console.error(error));

    documentHeight = document.documentElement.clientHeight;
    documentWidth = document.documentElement.clientWidth;
});
