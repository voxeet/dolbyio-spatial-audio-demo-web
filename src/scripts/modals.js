const displayModal = (elementId) => {
    const modalElement = document.getElementById(elementId);
    const bootstrapModal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false,
        focus: true
    });
    bootstrapModal.show();
};

const hideModal = (elementId) => {
    const modalElement = document.getElementById(elementId);
    const bootstrapModal = bootstrap.Modal.getInstance(modalElement);
    bootstrapModal.hide();
};

const displayErrorModal = (errorMessage) => {
    $('#error-message').text(errorMessage);
    displayModal('error-modal');
};
