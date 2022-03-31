const avatars = [
    'alien.png',
    'archer.png',
    'celebrity.png',
    'cyborg.png',
    'man.png',
    'spy.png',
    'vr-glasses.png',
    'wizard.png',
    'woman.png',
];

const getRandomAvatar = () => {
    const image = avatars[Math.floor(Math.random() * avatars.length)];
    return `images/${image}`;
};

const isSpeakingColors = [
    'red',
    'blue',
    'green',
];

const getRandomIsSpeakingColor = () => {
    return isSpeakingColors[Math.floor(Math.random() * isSpeakingColors.length)];
};

/**
 * Returns a boolean to indicate if the participant is connected to the conference or not.
 * @param participant Participant object to get the connection status.
 * @returns `true` if the participant is connected, `false` otherwise.
 */
 const isConnected = (participant) => {
    return [ 'Decline', 'Error', 'Kicked', 'Left' ].indexOf(participant.status) < 0;
};

/**
 * Load the audio and video devices.
 */
const loadAudioVideoDevices = async () => {
    try {
        // Load the Output Audio devices
        const audioOutput = await VoxeetSDK.mediaDevice.enumerateAudioDevices("output");
        console.log("Output Audio Devices");
        console.log(audioOutput);

        const audioOutput2 = [];
        audioOutput.forEach(device => {
            $('#output-audio-devices').append(new Option(device.label, device.deviceId));
            audioOutput2.push({label: device.label, deviceId: device.deviceId});
        });

        $('#btn-set-output-audio-device').attr('disabled', false);

        // Load the Input Audio devices
        const audioInput = await VoxeetSDK.mediaDevice.enumerateAudioDevices("input");
        console.log("Input Audio Devices");
        console.log(audioInput);

        const audioInput2 = [];
        audioInput.forEach(device => {
            $('#input-audio-devices').append(new Option(device.label, device.deviceId));
            audioInput2.push({label: device.label, deviceId: device.deviceId});
        });

        $('#btn-set-input-audio-device').attr('disabled', false);

        // Load the Video devices
        const videoInput = await VoxeetSDK.mediaDevice.enumerateVideoDevices("input");
        console.log("Video Devices");
        console.log(videoInput);

        const videoInput2 = [];
        videoInput.forEach(device => {
            $('#video-devices').append(new Option(device.label, device.deviceId));
            videoInput2.push({label: device.label, deviceId: device.deviceId});
        });

        $('#btn-set-video-device').attr('disabled', false);
    } catch (error) {
        console.error(error);
    }
};

var listenIsSpeakingIntervalId;

/**
 * Add a graphical element to indicate when a user is speaking.
 */
const listenIsSpeaking = () => {
    listenIsSpeakingIntervalId = setInterval(() => {
        [...VoxeetSDK.conference.participants].map((val) => {
            const participant = val[1];
            VoxeetSDK.conference.isSpeaking(participant, (isSpeaking) => {
                const container = document.getElementById(`user-${participant.id}-container`);
                if (container) {
                    if (isSpeaking) {
                        container.classList.add('is-speaking');
                    } else {
                        container.classList.remove('is-speaking');
                    }
                }
            });
        });
    }, 500);
};

const stopListenIsSpeaking = () => {
    clearInterval(listenIsSpeakingIntervalId);
};

/**
 * Shows a toast message in the top right corner of the window.
 * @param {string} title Title of the toast alert.
 * @param {string} message Message to display in the toast alert.
 */
const showToast = (title, message) => {
    const toastElement = $($('#toast-template').render({title, message}));
    $('#toasts').append(toastElement);

    // Display the toast alert
    const toast = new bootstrap.Toast(toastElement, { });
    toast.show();
};
