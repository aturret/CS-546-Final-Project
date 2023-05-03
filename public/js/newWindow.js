const editReviewWindow = document.getElementById('editReviewWindow');
const editReviewButton = document.getElementById('editReviewButton');
const addReviewWindow = document.getElementById('addReviewWindow');
const addReviewButton = document.getElementById('addReviewButton');


function editReview() {
    editReviewWindow.style.display = 'block';
    editReviewWindow.hidden = false;
    editReviewButton.style.display = 'none';
    editReviewButton.hidden = true;
}

function addReview() {
    addReviewWindow.style.display = 'block';
    addReviewWindow.hidden = false;
    addReviewButton.style.display = 'none';
    addReviewButton.hidden = true;
}

function editRoom(roomId){
    const editId = `edit-${roomId}`;
    const editRoomWindow = document.getElementById(editId);
    editRoomWindow.style.display = 'block';
    editRoomWindow.hidden = false;
}

function editRoomType(roomTypeId){
    const editId = `edit-${roomTypeId}`;
    const editRoomWindow = document.getElementById(editId);
    editRoomWindow.style.display = 'block';
    editRoomWindow.hidden = false;
}