const { app, BrowserWindow, Menu, MenuItem, ipcMain, systemPreferences, dialog, powerSaveBlocker } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            worldSafeExecuteJavaScript: true,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js")
        },
    });

    win.loadFile('src/index.html');

    return win;
}

async function askForMediaAccess(media) {
    try {
        console.log('process.platform', process.platform)
        if (process.platform !== "darwin") {
            return true;
        }
        const status = await systemPreferences.getMediaAccessStatus(media);
        console.log(`Current ${media} access status:`, status);

        if (status !== "granted") {
            const success = await systemPreferences.askForMediaAccess(media);
            console.log(`Current ${media} access status:`, success.valueOf() ? "granted" : "denied");
            return success.valueOf();
        }

        return status === "granted";
    } catch (error) {
        dialog.showMessageBox(null, {message: "Could not get " + media + " permission: " + error.message});
    }

    return false;
}

const template = [
    {
        label: app.name,
        submenu: [
            { label: "About", selector: "orderFrontStandardAboutPanel:" },
            { type: "separator" },
            {
                label: "Quit", accelerator: "Command+Q", click: function () {
                    app.quit();
                }
            }
        ]
    },
    {
        label: "Devices",
        submenu: [
            { id: "microphones", label: "Microphones", submenu: [] },
            { id: "speakers", label: "Speakers", submenu: [] },
            { id: "cameras", label: "Cameras", submenu: [] }
        ]
    },
    {
        label: "Actions",
        submenu: [
            { id: "mute", label: "Mute", visible: true },
            { id: "unmute", label: "Unmute", visible: false },
            { id: "videoOn", label: "Video On", visible: true },
            { id: "videoOff", label: "Video Off", visible: false },
            { type: "separator" },
            { id: "takeControl", label: "Take Control", visible: true },
            { id: "releaseControl", label: "Release Control", visible: false },
        ]
    },
    {
        label: "Help",
        submenu: [
            {
                label: "Toggle Developer Tools",
                role: "toggleDevTools",
                click: () => BrowserWindow.getFocusedWindow().toggleDevTools()
            }
        ]
    }
];

app.whenReady().then(async () => {
    await askForMediaAccess("microphone");
    await askForMediaAccess("camera");

    const win = createWindow();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    const muteMenuItem = menu.getMenuItemById('mute');
    const unmuteMenuItem = menu.getMenuItemById('unmute');
    const videoOnMenuItem = menu.getMenuItemById('videoOn');
    const videoOffMenuItem = menu.getMenuItemById('videoOff');
    const takeControlMenuItem = menu.getMenuItemById('takeControl');
    const releaseControlMenuItem = menu.getMenuItemById('releaseControl');

    muteMenuItem.click = () => {
        muteMenuItem.visible = false;
        unmuteMenuItem.visible = true;
        win.webContents.send('actionMute');
        Menu.setApplicationMenu(menu);
    };

    unmuteMenuItem.click = () => {
        unmuteMenuItem.visible = false;
        muteMenuItem.visible = true;
        win.webContents.send('actionUnmute');
        Menu.setApplicationMenu(menu);
    };

    videoOnMenuItem.click = () => {
        videoOnMenuItem.visible = false;
        videoOffMenuItem.visible = true;
        win.webContents.send('actionVideoOn');
        Menu.setApplicationMenu(menu);
    };

    videoOffMenuItem.click = () => {
        videoOffMenuItem.visible = false;
        videoOnMenuItem.visible = true;
        win.webContents.send('actionVideoOff');
        Menu.setApplicationMenu(menu);
    };

    takeControlMenuItem.click = () => {
        takeControlMenuItem.visible = false;
        releaseControlMenuItem.visible = true;
        win.webContents.send('actionTakeControl');
        Menu.setApplicationMenu(menu);
    };

    releaseControlMenuItem.click = () => {
        releaseControlMenuItem.visible = false;
        takeControlMenuItem.visible = true;
        win.webContents.send('actionReleaseControl');
        Menu.setApplicationMenu(menu);
    };

    const addDevices = (devices, menuItemId, commandName) => {
        devices.forEach(device => {
            menu.getMenuItemById(menuItemId).submenu.append(new MenuItem({
                label: device.label, type: "radio", click: function () {
                    win.webContents.send(commandName, device.deviceId);
                }
            }));
        });

        Menu.setApplicationMenu(menu);
    };

    ipcMain.on('microphonesLoaded', (_, devices) => addDevices(devices, 'microphones', 'microphoneSelected'));
    ipcMain.on('speakersLoaded', (_, devices) => addDevices(devices, 'speakers', 'speakerSelected'));
    ipcMain.on('camerasLoaded', (_, devices) => addDevices(devices, 'cameras', 'cameraSelected'));

    ipcMain.on('conferenceJoined', (e) => {
        try {
            powerId = powerSaveBlocker.start('prevent-display-sleep');
        } catch (e) {
            console.error('Could not start power save blocker', e.message);
        }
    });

    ipcMain.on('conferenceLeft', (e) => {
        try {
            if (powerId !== null) {
                powerSaveBlocker.stop(powerId);
            }
            powerId = null;
        } catch (e) {
            console.error('Could not stop power save blocker', e.message);
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    //if (process.platform !== 'darwin') {
    app.quit();
    //}
});
