document.addEventListener('DOMContentLoaded', function() {
    var isLoggedIn = localStorage.getItem('isLoggedIn');
    var currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!isLoggedIn === 'true' || !currentUser || currentUser.type !== 1) {
        window.location.href = '../index.html';
    }

    var contentInput = document.getElementById('content');
    var themeSelect = document.getElementById('theme');
    var isPublicCheckbox = document.getElementById('isPublic');
    var errorSection = document.getElementById('successSection');
    var errorSection = document.getElementById('errorSection');

    function fetchThemes() {
        var request = indexedDB.open('questBank', 1);

        request.onsuccess = function(event) {
            var dataBase = event.target.result;
            var transaction = dataBase.transaction(['themes'], 'readonly');
            var objectStore = transaction.objectStore('themes');
            var themesSelect = document.getElementById('theme');

            objectStore.openCursor().onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor) {
                    var theme = cursor.value.name;
                    var option = document.createElement('option');
                    option.value = theme;
                    option.textContent = theme;
                    themesSelect.appendChild(option);
                    cursor.continue();
                }
            };
        };

        request.onerror = function(event) {
            console.error('Erro ao abrir o banco de dados', event.target.errorCode);
            errorSection.textContent = 'Erro ao abrir o banco de dados: ' + event.target.errorCode;
            successSection.textContent = '';
            themeSelect.disabled = true;
        };
    }

    fetchThemes();

    document.getElementById('newQuestion').addEventListener('click', function() {
        var content = contentInput.value.trim();
        var theme = themeSelect.value.trim();
        var isPublic = isPublicCheckbox.checked;

        if (content === '' || theme === '' || content === null || theme === null) {
            errorSection.textContent = 'Por favor, preencha todos os campos.';
            successSection.textContent = '';
            return;
        }

        var transaction = db.transaction(['questions'], 'readwrite');
        var questionsStore = transaction.objectStore('questions');
        var newQuestion = { question: content, isPublic: isPublic, theme_id: theme, user_id: currentUser.id};
        var addQuestionRequest = questionsStore.add(newQuestion);

        contentInput.value = '';
        themeSelect.value = '';
        isPublicCheckbox.checked = true;
        errorSection.textContent = '';
        successSection.textContent = 'Questão cadastrada com sucesso.';
    });
});
