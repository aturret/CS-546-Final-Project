const editReviewWindow = document.getElementById('editReviewWindow');
const editReviewButton = document.getElementById('editReviewButton');
const addReviewWindow = document.getElementById('addReviewWindow');
const addReviewButton = document.getElementById('addReviewButton');
const editHotelWindow = document.getElementById('editHotelWindow');
const editHotelButton = document.getElementById('editHotelButton');
const writeReplyWindow = document.getElementById('writeReplyWindow');
const writeReplyButton = document.getElementById('writeReplyButton');
const newHotelButton = document.getElementById('newHotelButton');
const newHotelWindow = document.getElementById('newHotelWindow');


function editReview() {
    editReviewWindow.hidden = false;
    editReviewButton.style.display = 'none';
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

function editHotel(){
    editHotelWindow.style.display = 'block';
    editHotelWindow.hidden = false;
    editHotelButton.style.display = 'none';
    editHotelButton.hidden = true;
}

function writeReply(){
    writeReplyWindow.style.display = 'block';
    writeReplyWindow.hidden = false;
    writeReplyButton.style.display = 'none';
    writeReplyButton.hidden = true;
}

function newHotel(){
    newHotelWindow.style.display = 'block';
    newHotelWindow.hidden = false;
    newHotelButton.style.display = 'none';
    newHotelButton.hidden = true;
}

