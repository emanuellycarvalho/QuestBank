document.addEventListener('DOMContentLoaded', function() {
    var isLoggedIn = localStorage.getItem('isLoggedIn');
    var currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!isLoggedIn === 'true' || !currentUser || currentUser.type !== 1) {
        window.location.href = '../index.html';
    }

    function populateHistoryTable() {
        var request = indexedDB.open('questBank', 1);
    
        request.onsuccess = function(event) {
            var db = event.target.result;
            var transaction = db.transaction(['history', 'themes', 'questions'], 'readonly');
            var historyStore = transaction.objectStore('history');
            var themesStore = transaction.objectStore('themes');
            var questionsStore = transaction.objectStore('questions');
            var historyTableBody = document.getElementById('historyTableBody');
    
            historyStore.openCursor().onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor) {
                    console.log(cursor.value)
                    var questionId = cursor.value.question_id;
                    var questionRequest = questionsStore.get(questionId);
    
                    questionRequest.onsuccess = function(event) {
                        var questionTitle = event.target.result.question;

                        var themeId = event.target.result.theme_id;
                        var themeRequest = themesStore.get(themeId);

                        themeRequest.onsuccess = function(event) {
                            var themeName = event.target.result.name;
                            var row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${questionTitle}</td>
                                <td>${themeName}</td>
                                <td>${cursor.value.class}</td>
                                <td>${cursor.value.accuracy_average}</td>
                                <td>${new Date(cursor.value.date).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-outline-primary btn-sm" onclick="viewQuestion(${cursor.key})">Editar</button>
                                    <button class="btn btn-outline-success btn-sm" onclick="editQuestion(${cursor.key})">Ver</button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteQuestion(${cursor.key})">Excluir</button>
                                </td>
                            `;
                            historyTableBody.appendChild(row);
                        };
                    };
    
                    cursor.continue();
                }
            };
        };
    
        request.onerror = function(event) {
            console.error('Erro ao abrir o banco de dados', event.target.errorCode);
        };
    }
    
    populateHistoryTable();
});
