dangerButtons = document.querySelectorAll('button.danger');
cancelButtons = document.querySelectorAll('button.cancel');

dangerButtons.forEach(button => {
    button.addEventListener('click', function (event) {
        const confirmation = confirm('Are you sure you want to delete this?');
        if (!confirmation) event.preventDefault();
    })
})

cancelButtons.forEach(button => {
    button.addEventListener('click', function (event) {
        const confirmation = confirm('Are you sure you want to cancel this?');
        if (!confirmation) event.preventDefault();
    })
})