var currentUser;
document.addEventListener('DOMContentLoaded', function() {
    var isLoggedIn = localStorage.getItem('isLoggedIn');
    currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!isLoggedIn === 'true' || !currentUser || currentUser === undefined) {
        window.location.href = '../index.html';
    }
});

async function getHistoryDataByQuestionId(question_id) {
    return new Promise((resolve, reject) => {
        var request = indexedDB.open('questBank', 1);

        request.onsuccess = async function(event) {
            var db = event.target.result;
            var transaction = db.transaction(['history', 'themes', 'questions', 'users'], 'readonly');
            var themesStore = transaction.objectStore('themes');
            var questionsStore = transaction.objectStore('questions');
            var historyStore = transaction.objectStore('history');

            var results = [];
            var historyRequest = historyStore.openCursor();

            historyRequest.onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor) {
                    var history = cursor.value;
                    if (history.question_id === question_id) {
                        var questionRequest = questionsStore.get(history.question_id);
                        questionRequest.onsuccess = function(event) {
                            var questionResult = event.target.result;

                            var themeRequest = themesStore.get(questionResult.theme_id);
                            themeRequest.onsuccess = function(event) {
                                var themeResult = event.target.result;

                                // Verificar se já temos uma entrada para esta questão
                                var existingEntry = results.find(r => r.question_id === question_id);
                                if (!existingEntry) {
                                    existingEntry = {
                                        question: questionResult.question,
                                        question_id: questionResult.id,
                                        theme: themeResult.name,
                                        isPublic: questionResult.isPublic,
                                        visibility: questionResult.visibility,
                                        appliedTests: []
                                    };
                                    results.push(existingEntry);
                                }

                                // Adicionar o registro de histórico ao array appliedTests
                                existingEntry.appliedTests.push({
                                    accuracy_average: history.accuracy_average + '%',
                                    class: history.class,
                                    date: history.date,
                                    observations: history.observations
                                });

                                cursor.continue(); // Avança para o próximo registro
                            };
                        };
                    } else {
                        cursor.continue(); // Avança para o próximo registro
                    }
                } else {
                    console.log(results[0]);
                    // Quando o cursor estiver completo, resolva a promessa com os resultados
                    resolve(results[0]);
                }
            };

            historyRequest.onerror = function(event) {
                reject('Erro ao buscar registros de history');
            };
        };

        request.onerror = function(event) {
            reject('Erro ao abrir o banco de dados');
        };
    });
}


async function viewCompleteHistory(item_id) {
    const item = await getHistoryDataByQuestionId(item_id);

    var questionSection = document.getElementById('questionSection');
    var privacySection = document.getElementById('privacySection');
    var userSection = document.getElementById('userSection');
    var themeSection = document.getElementById('themeSection');

    questionSection.innerText = item.question;

    privacySection.innerText = item.isPublic ? 'Pública' : 'Privada';
    privacySection.style.color = item.isPublic ? 'green' : 'red';
    themeSection.innerText = item.theme;

    if (item.user) {
        userSection.innerText = 'Enviada por ' + item.user.name + ' (' + item.user.email + ')';
    } else {
        userSection.innerText = '';
    }

    var detailsQuestion = await getHistoryDataByQuestionId(item.question_id);
    
    var modalTableBody = document.getElementById('modalTableBody');
    modalTableBody.innerHTML = '';

    var totalRows = detailsQuestion.appliedTests.length;

    for (let i = 0; i < totalRows; i++) {
        var row = document.createElement('tr');
        row.innerHTML = `
            <td>${detailsQuestion.appliedTests[i].class}</td>
            <td>${detailsQuestion.appliedTests[i].accuracy_average}</td>
            <td>${new Date(detailsQuestion.appliedTests[i].date).toLocaleDateString()}</td>
            <td>${detailsQuestion.appliedTests[i].observations}</td>
        `;
        modalTableBody.appendChild(row);
    }

    $('#historyModal').modal('toggle');
}

async function frequencyReport(item_id) {
    const item = await getHistoryDataByQuestionId(item_id);
    const historyItems = await getHistoryDataByQuestionId(item.question_id);
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
