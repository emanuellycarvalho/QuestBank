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
                                <td>${cursor.value.accuracy_average}%</td>
                                <td>${new Date(cursor.value.date).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-outline-success btn-sm" onclick="viewCompleteHistory(${cursor.key})">Ver mais</button>
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

async function getHistoryData(history_id) {
    return new Promise((resolve, reject) => {
        var request = indexedDB.open('questBank', 1);
        request.onsuccess = async function(event) {
            var db = event.target.result;
            var transaction = db.transaction(['history', 'themes', 'questions', 'users'], 'readonly');
            var themesStore = transaction.objectStore('themes');
            var questionsStore = transaction.objectStore('questions');
            var historyStore = transaction.objectStore('history');
            var usersStore = transaction.objectStore('users');
        
            var historyRequest = historyStore.get(history_id);
            historyRequest.onsuccess = async function(event) {
                var history = event.target.result;
                console.log(history);
                var questionRequest = questionsStore.get(history.question_id);
                questionRequest.onsuccess = async function(event) {
                    var questionResult = event.target.result;
                    var themeRequest = themesStore.get(questionResult.theme_id);
                    themeRequest.onsuccess = async function(event) {
                        var themeResult = event.target.result;
                        var userRequest = usersStore.get(history.user_id);
                        userRequest.onsuccess = async function(event) {
                            var userResult = event.target.result;
                            resolve({
                                id: history.id,
                                question: questionResult.question,
                                theme: themeResult.name,
                                class: history.class,
                                average: history.accuracy_average + '%',
                                date: new Date(history.date).toLocaleDateString(),
                                privacy: history.isPublic,
                                user: userResult
                            });
                        };
                    };
                };
            }
        };

        request.onerror = function(event) {
            reject('Erro ao abrir o banco de dados');
        };
    });
}

async function viewCompleteHistory(item_id){
    const item = await  getHistoryData(item_id);
    console.log(item);

    var questionSection = document.getElementById('questionSection');
    var privacySection = document.getElementById('privacySection');
    var accuracySection = document.getElementById('accuracySection');
    var userSection = document.getElementById('userSection');
    var themeSection = document.getElementById('themeSection');

    questionSection.innerText = item.question;

    privacySection.innerText = item.privacy ? 'Pública' : 'Privada';
    privacySection.style.color = item.privacy ? 'green' : 'red';
    accuracySection.innerText = 'Precisão média de ' + item.average;
    themeSection.innerText = item.theme;
    
    if(item.user) {
        userSection.innerText = 'Enviada por ' + item.user.name + ' (' + item.user.email + ') em ' + item.date;
    } 
    
    $('#historyModal').modal('toggle');
}