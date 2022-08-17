VoxeetSDK.command.on("received", (participant, message) => {
    const jMessage = JSON.parse(message);

    if (jMessage.action === 'updatePosition') {
        animateParticipantPosition(jMessage.layout, participant.id, jMessage.position);
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
                complete: async () => {
                    const participant = VoxeetSDK.conference.participants.get(participantId);
                    await setSpatialPosition(participant);
                }
            }
        );
};

/**
 * Notify of the new local participant position.
 */
const updatePosition = async () => {
    // Look for the participant element
    const pId = VoxeetSDK.session.participant.id;
    const videoContainer = document.getElementById(`user-${pId}-container`);
    if (videoContainer) {
        // Get the position of the UI element
        const elementPosition = videoContainer.getBoundingClientRect();

        await VoxeetSDK.command.send({
            action: 'updatePosition',
            layout: {
                width: document.documentElement.clientWidth,
                height: document.documentElement.clientHeight,
            },
            position: {
                left: elementPosition.left,
                top: elementPosition.top,
            }
        });
    }
};
