var currentUser;
document.addEventListener('DOMContentLoaded', function() {
    var isLoggedIn = localStorage.getItem('isLoggedIn');
    currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!isLoggedIn === 'true' || !currentUser || currentUser === undefined) {
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
    
            var processedQuestions = new Set();
    
            historyStore.openCursor().onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor) {
                    var questionId = cursor.value.question_id;
    
                    if (!processedQuestions.has(questionId)) {
                        processedQuestions.add(questionId);
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
                                    <td>
                                        <div class="row">
                                            <div class="col-auto">
                                                <button class="btn btn-outline-success btn-sm" onclick="viewCompleteHistory(${cursor.key})">Ver histórico</button>
                                            </div>
                                            <div class="col-auto">
                                                <button class="teachersOnly btn btn-danger btn-sm" onclick="deleteHistory(${cursor.key})">Excluir</button>
                                            </div>
                                            <div class="col-auto">
                                                <button class="teachersOnly btn btn-primary btn-sm" onclick="newHistory(${cursor.key})">Novo uso</button>
                                            </div>
                                        </div>
                                    </td>
                                `;
                                historyTableBody.appendChild(row);

                                updateItemStatus();
                            };
    
                            themeRequest.onerror = function(event) {
                                console.error('Erro ao buscar o tema', event.target.errorCode);
                            };
                        };
    
                        questionRequest.onerror = function(event) {
                            console.error('Erro ao buscar a questão', event.target.errorCode);
                        };
                    }
                    cursor.continue();
                }
            };
    
            historyStore.openCursor().onerror = function(event) {
                console.error('Erro ao abrir o cursor', event.target.errorCode);
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
                                question_id: questionResult.id,
                                theme: themeResult.name,
                                class: history.class,
                                average: history.accuracy_average + '%',
                                date: history.date,
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

async function getHistoryByQuestionId(question_id) {
    return new Promise((resolve, reject) => {
        var request = indexedDB.open('questBank', 1);
        request.onsuccess = function(event) {
            var db = event.target.result;
            var transaction = db.transaction(['history'], 'readonly');
            var historyStore = transaction.objectStore('history');
            var items = [];

            var index = historyStore.index('question_id');
            var range = IDBKeyRange.only(question_id);
            index.openCursor(range).onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor) {
                    items.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(items);
                }
            };

            transaction.onerror = function(event) {
                reject('Erro ao abrir o banco de dados');
            };
        };

        request.onerror = function(event) {
            reject('Erro ao abrir o banco de dados');
        };
    });
}

async function viewCompleteHistory(item_id) {
    const item = await getHistoryData(item_id);

    var questionSection = document.getElementById('questionSection');
    var privacySection = document.getElementById('privacySection');
    var userSection = document.getElementById('userSection');
    var themeSection = document.getElementById('themeSection');

    questionSection.innerText = item.question;

    privacySection.innerText = item.privacy ? 'Pública' : 'Privada';
    privacySection.style.color = item.privacy ? 'green' : 'red';
    themeSection.innerText = item.theme;

    if (item.user) {
        userSection.innerText = 'Enviada por ' + item.user.name + ' (' + item.user.email + ')';
    } else {
        userSection.innerText = '';
    }

    var historyItems = await getHistoryByQuestionId(item.question_id);
    historyItems.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    var modalTableBody = document.getElementById('modalTableBody');
    modalTableBody.innerHTML = '';

    var maxRows = 2;
    var totalRows = historyItems.length;

    for (let i = 0; i < Math.min(maxRows, totalRows); i++) {
        var row = document.createElement('tr');
        row.innerHTML = `
            <td>${historyItems[i].class}</td>
            <td>${historyItems[i].accuracy_average}%</td>
            <td>${new Date(historyItems[i].date).toLocaleDateString()}</td>
        `;
        modalTableBody.appendChild(row);
    }

    if (totalRows > maxRows) {
        var remainingRows = totalRows - maxRows;
        var remainingRow = document.createElement('tr');
        remainingRow.innerHTML = `
            <td colspan="3">Mais ${remainingRows} registros</td>
        `;
        modalTableBody.appendChild(remainingRow);
    }


    var modalFooterButtons = document.getElementById('modalFooterButtons');
    const frequencyReportBtn = `<button class="teachersOnly btn btn-outline-primary btn-sm" onclick="frequencyReport(${item_id})">Relatório de frequência</button>`;
    modalFooterButtons.innerHTML = frequencyReportBtn;

    $('#historyModal').modal('toggle');
}

async function frequencyReport(item_id) {
    const item = await getHistoryData(item_id);
    const historyItems = await getHistoryByQuestionId(item.question_id);
    const data = historyItems.map(item => ({
        "Turma": item.class,
        "Porcentagem de acertos": item.accuracy_average + "%",
        "Data de Uso": new Date(item.date).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data, { header: ["Turma", "Porcentagem de acertos", "Data de Uso"] });

    const headers = ["Turma", "Porcentagem de acertos", "Data de Uso"];
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

    const wscols = [
        { wch: Math.max(...data.map(row => row["Turma"].length), "Turma".length) },
        { wch: Math.max(...data.map(row => row["Porcentagem de acertos"].length), "Porcentagem de acertos".length) },
        { wch: Math.max(...data.map(row => row["Data de Uso"].length), "Data de Uso".length) }
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório de Frequência');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_frequencia_${item_id}.xlsx`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function deleteHistory(item_id){
    if(await deleteById('history', item_id)){
        alert('Item removido com sucesso do histórico');
        window.location.reload();
    }
}

function newHistory(item_id) {
    window.location.href = `new-questions.html?id=${item_id}`;
}

async function addHistory() {
    try {
        const question = document.getElementById('id').value;
        const theme = document.getElementById('theme').value;
        const classValue = document.getElementById('class').value;
        const average = document.getElementById('average').value;

        if (!question || !theme || !classValue || !average) {
            document.getElementById('errorSection').innerText = 'Todos os campos são obrigatórios.';
            return;
        }

        const newHistory = {
            question_id: parseInt(question), 
            theme_id: parseInt(theme), 
            class: classValue,
            accuracy_average: parseFloat(average),
            date: new Date().toISOString(), 
            user_id: currentUser.id 
        };

        const request = indexedDB.open('questBank', 1);

        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['history'], 'readwrite');
            const historyStore = transaction.objectStore('history');

            const addRequest = historyStore.add(newHistory);

            addRequest.onsuccess = function(event) {
                document.getElementById('successSection').innerText = 'Histórico adicionado com sucesso.';
                document.getElementById('errorSection').innerText = '';
                document.getElementById('class').value = '';
                document.getElementById('average').value = '';
            };

            addRequest.onerror = function(event) {
                document.getElementById('errorSection').innerText = 'Erro ao adicionar histórico.';
                document.getElementById('successSection').innerText = '';
            };
        };

        request.onerror = function(event) {
            document.getElementById('errorSection').innerText = 'Erro ao abrir o banco de dados.';
            document.getElementById('successSection').innerText = '';
        };
    } catch (error) {
        document.getElementById('errorSection').innerText = 'Erro inesperado: ' + error.message;
        document.getElementById('successSection').innerText = '';
    }
}
