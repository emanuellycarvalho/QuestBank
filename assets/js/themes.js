document.addEventListener('DOMContentLoaded', function() {
    var isLoggedIn = localStorage.getItem('isLoggedIn');
    var currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!isLoggedIn === 'true' || !currentUser || currentUser.type !== 1) {
        window.location.href = '../index.html';
    }

    var errorSection = document.getElementById('successSection');
    var errorSection = document.getElementById('errorSection');

    document.getElementById('newTheme').addEventListener('click', function() {
        var nameInput = document.getElementById('theme');

        if (nameInput.value === '' || nameInput.value === null) {
            errorSection.textContent = 'Por favor, preencha todos os campos.';
            successSection.textContent = '';
            return;
        }

        var transaction = db.transaction(['themes'], 'readwrite');
        var themesStore = transaction.objectStore('themes');
        var newTheme = { name: nameInput.value };
        themesStore.add(newTheme);

        nameInput.value = '';
        successSection.textContent = 'Tema cadastrado com sucesso.';
        errorSection.textContent = '';
    });
});
