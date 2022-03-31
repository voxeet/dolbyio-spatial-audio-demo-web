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

const isEmptyPosition = (top, left, height, width) => {
    const elements = document.getElementsByClassName('user-container');
    for (let index = 0; index < elements.length; index++) {
        const rect = elements[index].getBoundingClientRect();

        if (top >= (rect.top - height) && (top + height) <= (rect.top + rect.height)) return false;
        if (left >= (rect.left - width) && (left + width) <= (rect.left + rect.width)) return false;
    }

    return true;
};

const getEmptyPosition = (height, width) => {
    const usersContainer = document.getElementById('users-container').getBoundingClientRect();

    const xMin = usersContainer.left;
    const xMax = usersContainer.left + usersContainer.width - width;
    const yMin = usersContainer.top;
    const yMax = usersContainer.top + usersContainer.height - height;

    var top = 0;
    var left = 0;

    for (let index = 0; index < 10; index++) {
        left = xMin + Math.floor(Math.random() * (xMax - xMin));
        top = yMin + Math.floor(Math.random() * (yMax - yMin));
        
        if (isEmptyPosition(top, left, height, width)) {
            break;
        }
    }

    return { top, left };
};

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

    const position = getEmptyPosition(clientRect.height, clientRect.width)
    element.attr('style', `top: ${position.top}px; left: ${position.left}px;`);

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
    const scale   = { x: window.innerWidth / 1, y: window.innerHeight / 1, z: 1 };
    const forward = { x: 0, y: -1, z: 0 };
    const up      = { x: 0, y: 0,  z: 1 };
    const right   = { x: 1, y: 0,  z: 0 };

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

const createAndJoinConference = async (isDemo) => {
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
        hideModal('login-modal');

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

        if (isDemo) {
            // Join a demo conference
            await VoxeetSDK.conference.demo(joinOptions);
        } else {
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
            
            // Join the conference
            await VoxeetSDK.conference.join(conference, joinOptions);
        }

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
};

$('#btn-demo').click(async () => {
    await createAndJoinConference(true);
});

$('#btn-join').click(async () => {
    await createAndJoinConference(false);
});

$('#btn-initialize').click(() => {
    var key = $('#input-consumer-key').val();
    var secret = $('#input-consumer-secret').val();

    VoxeetSDK.initialize(key, secret);

    hideModal('init-modal');

    displayModal('login-modal');
});

const displayModal = (elementId) => {
    const modalElement = document.getElementById(elementId);
    const bootstrapModal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false,
        focus: true
    });
    bootstrapModal.show();
}

const hideModal = (elementId) => {
    const modalElement = document.getElementById(elementId);
    const bootstrapModal = bootstrap.Modal.getInstance(modalElement);
    bootstrapModal.hide();
}

$(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        console.log(`Initialize the SDK with the Access Token: ${token}`);
        VoxeetSDK.initializeToken(token, () => token);
        displayModal('login-modal');
    } else {
        displayModal('init-modal');
    }

    documentHeight = document.documentElement.clientHeight;
    documentWidth = document.documentElement.clientWidth;
});
