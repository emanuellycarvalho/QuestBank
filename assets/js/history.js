document.addEventListener('DOMContentLoaded', function() {
    var isLoggedIn = localStorage.getItem('isLoggedIn');
    var currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!isLoggedIn === 'true' || !currentUser || currentUser.type !== 1) {
        window.location.href = '../index.html';
    }

    async function populateHistoryTable() {
        var request = indexedDB.open('questBank', 1);
    
        request.onsuccess = async function(event) {
            var db = event.target.result;
            var transaction = db.transaction(['history'], 'readonly');
            var historyStore = transaction.objectStore('history');
            var historyTableBody = document.getElementById('historyTableBody');
    
            var historyTransacion = await historyStore.openCursor();
            historyTransacion.onsuccess = async function(event) {
                var cursor = event.target.result;
                if (cursor) {
                    var item = await getHistoryData(cursor.value.id);
                    if (item !== null) {
                        var row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${item.question}</td>
                            <td>${item.theme}</td>
                            <td>${item.class}</td>
                            <td>${item.average}</td>
                            <td>${item.date}</td>
                            <td>
                                <button class="btn btn-outline-success btn-sm" onclick="viewCompleteHistory(${item.id})">Ver mais</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteQuestion(${item.id})">Excluir</button>
                            </td>
                        `;
                        historyTableBody.appendChild(row);
                    }
    
                    await cursor.continue();
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
    var dateSection = document.getElementById('dateSection');
    var accuracySection = document.getElementById('accuracySection');
    var userSection = document.getElementById('userSection');

    questionSection.innerText = item.question;

    privacySection.innerText = item.privacy ? 'Pública' : 'Privada';
    privacySection.style.color = item.privacy ? 'green' : 'red';
    
    accuracySection.innerText = 'Precisão média de ' + item.average;
    if(item.user) {
        userSection.innerText = 'Enviada por ' + item.user.name + ' (' + item.user.email + ') em ' + item.date;
    } 
    
    $('#historyModal').modal('toggle');
}
