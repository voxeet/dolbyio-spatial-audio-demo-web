var participantControl = null;

VoxeetSDK.conference.on('participantUpdated', (participant) => {
    if (participantControl != null && participantControl.id === participant.id && !isConnected(participant)) {
        // The participant controlling the spatial audio has left
        onReleaseControl();
    }
});

VoxeetSDK.command.on("received", (participant, message) => {
    var jMessage = JSON.parse(message);

    if (jMessage.action === 'takeControl') {
        participantControl = participant;
        document.body.classList.add("controlled");
        showToast('Spatial Audio', `${participant.info.name} is taking control over the Audio placement.`);

        jMessage.participants.forEach(participant => {
            animateParticipantPosition(jMessage.layout, participant.id, participant.position);
        });
    } else if (jMessage.action === 'controlUpdatePosition') {
        animateParticipantPosition(jMessage.layout, jMessage.participantId, jMessage.position);
    } else if (jMessage.action === 'releaseControl') {
        onReleaseControl();
        showToast('Spatial Audio', `${participant.info.name} is releasing control over the Audio placement.`);
    }
});

const animateParticipantPosition = (layout, participantId, position) => {
    const top = document.documentElement.clientHeight * position.top / layout.height;
    const left = document.documentElement.clientWidth * position.left / layout.width;
    console.log(`Animate participant ${participantId} to top ${top} left ${left}`);

    $(`#user-${participantId}-container`)
        .animate({
                top: `${top}px`,
                left: `${left}px`
            }, {
                duration: 500,
                complete: () => {
                    const participant = VoxeetSDK.conference.participants.get(participantId);
                    setSpatialPosition(participant);
                }
            }
        );
};

/**
 * Notify of the new participant position.
 * @param participant Participant object.
 */
const controlUpdatePosition = async (participant) => {
    // Only notify when the local participant is in control
    if (participantControl != VoxeetSDK.session.participant) return;
    
    // Look for the participant element
    const videoContainer = document.getElementById(`user-${participant.id}-container`);
    if (videoContainer) {
        // Get the position of the UI element
        const elementPosition = videoContainer.getBoundingClientRect();

        await VoxeetSDK.command.send({
            action: 'controlUpdatePosition',
            layout: {
                width: document.documentElement.clientWidth,
                height: document.documentElement.clientHeight,
            },
            participantId: participant.id,
            position: {
                left: elementPosition.left,
                top: elementPosition.top,
            }
        });
    }
};

const takeControl = async () => {
    const participants = [];

    [...VoxeetSDK.conference.participants].map((val) => {
        const participant = val[1];
    
        // Look for the participant element
        const container = document.getElementById(`user-${participant.id}-container`);
        if (container) {
            // Get the position of the UI element
            const elementPosition = container.getBoundingClientRect();

            participants.push({
                id: participant.id,
                position: {
                    left: elementPosition.left,
                    top: elementPosition.top,
                }
            });
        }
    });

    await VoxeetSDK.command.send({
        action: 'takeControl',
        layout: {
            width: document.documentElement.clientWidth,
            height: document.documentElement.clientHeight,
        },
        participants: participants
    });

    participantControl = VoxeetSDK.session.participant;

    document.body.classList.add("has-control");
    document.getElementById('btn-take-control').classList.add('d-none');
    document.getElementById('btn-release-control').classList.remove('d-none');

    showToast('Spatial Audio', 'You are taking over the Audio placement.');
};


const onReleaseControl = () => {
    participantControl = null;

    document.body.classList.remove("has-control", "controlled");
    document.getElementById('btn-take-control').classList.remove('d-none');
    document.getElementById('btn-release-control').classList.add('d-none');
};

const releaseControl = async () => {
    await VoxeetSDK.command.send({
        action: 'releaseControl'
    });

    onReleaseControl();
};


if (window.electron) {
    window.electron.receive('actionTakeControl', async () => await takeControl());
    window.electron.receive('actionReleaseControl', async () => await releaseControl());
} else {
    $('#btn-take-control').click(async () => await takeControl());
    $('#btn-release-control').click(async () => await releaseControl());
}
