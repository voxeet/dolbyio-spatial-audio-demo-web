const { ipcRenderer, contextBridge } = require("electron");

contextBridge.exposeInMainWorld(
    'electron',
    {
        electronOnJoined: () => ipcRenderer.send("conferenceJoined"),
        electronOnLeft: () => ipcRenderer.send("conferenceLeft"),
        electronOnMicrophonesLoaded: (devices) => ipcRenderer.send("microphonesLoaded", devices),
        electronOnSpeakersLoaded: (devices) => ipcRenderer.send("speakersLoaded", devices),
        electronOnCamerasLoaded: (devices) => ipcRenderer.send("camerasLoaded", devices),
        receive: (channel, func) => {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
);
