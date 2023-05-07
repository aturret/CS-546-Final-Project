dangerButtons = document.querySelectorAll('button.danger');

dangerButtons.forEach(button => {
    button.addEventListener('click', function (event) {
        const confirmation = confirm('Are you sure you want to delete this?');
        if (!confirmation) event.preventDefault();
    })
})