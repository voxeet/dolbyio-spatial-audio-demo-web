const startVideo = async () => {
    try {
        await VoxeetSDK.conference.startVideo(VoxeetSDK.session.participant);

        document.getElementById('btn-video-off').classList.remove('d-none');
        document.getElementById('btn-video-on').classList.add('d-none');
    } catch (error) {
        console.error(error);
    }
};

const stopVideo = async () => {
    try {
        await VoxeetSDK.conference.stopVideo(VoxeetSDK.session.participant);

        document.getElementById('btn-video-off').classList.add('d-none');
        document.getElementById('btn-video-on').classList.remove('d-none');
    } catch (error) {
        console.error(error);
    }
};

const unmute = () => {
    try {
        VoxeetSDK.conference.mute(VoxeetSDK.session.participant, false);

        document.getElementById('btn-unmute').classList.add('d-none');
        document.getElementById('btn-mute').classList.remove('d-none');
    } catch (error) {
        console.error(error);
    }
};

const mute = () => {
    try {
        VoxeetSDK.conference.mute(VoxeetSDK.session.participant, true);

        document.getElementById('btn-unmute').classList.remove('d-none');
        document.getElementById('btn-mute').classList.add('d-none');
    } catch (error) {
        console.error(error);
    }
};

const selectVideoInput = async (deviceId) => {
    try {
        console.log('selectVideoInput', deviceId);
        await VoxeetSDK.mediaDevice.selectVideoInput(deviceId);
    } catch (error) {
        console.error(error);
    }
};

const selectAudioInput = async (deviceId) => {
    try {
        console.log('selectAudioInput', deviceId);
        await VoxeetSDK.mediaDevice.selectAudioInput(deviceId);
    } catch (error) {
        console.error(error);
    }
};

const selectAudioOutput = async (deviceId) => {
    try {
        console.log('selectAudioOutput', deviceId);
        await VoxeetSDK.mediaDevice.selectAudioOutput(deviceId);
    } catch (error) {
        console.error(error);
    }
};

if (window.electron) {
    window.electron.receive('actionVideoOn', async () => await startVideo());
    window.electron.receive('actionVideoOff', async () => await stopVideo());
    window.electron.receive('actionMute', () => mute());
    window.electron.receive('actionUnmute', () => unmute());
    window.electron.receive('microphoneSelected', async (deviceId) => {
        await VoxeetSDK.mediaDevice.selectAudioInput(deviceId);
    });
    window.electron.receive('speakerSelected', async (deviceId) => {
        await VoxeetSDK.mediaDevice.selectAudioOutput(deviceId);
    });
    window.electron.receive('cameraSelected', async (deviceId) => {
        await VoxeetSDK.mediaDevice.selectVideoInput(deviceId);
    });
} else {
    document.getElementById('btn-video-on').addEventListener('click', async () => await startVideo());
    document.getElementById('btn-video-off').addEventListener('click', async () => await stopVideo());
    document.getElementById('btn-unmute').addEventListener('click', () => unmute());
    document.getElementById('btn-mute').addEventListener('click', () => mute());
    document.getElementById('btn-set-video-device').addEventListener('click', async () => {
        const deviceId = document.getElementById('video-devices').value;
        await selectVideoInput(deviceId);
    });
    document.getElementById('btn-set-input-audio-device').addEventListener('click', async () => {
        const deviceId = document.getElementById('input-audio-devices').value;
        await selectAudioInput(deviceId);
    });
    document.getElementById('btn-set-output-audio-device').addEventListener('click', async () => {
        const deviceId = document.getElementById('output-audio-devices').value;
        await selectAudioOutput(deviceId);
    });
}
