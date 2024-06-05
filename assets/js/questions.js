$(document).ready(() => {
    class Question {
        constructor(id, question, theme_id, isPublic, user_id) {
            this.id = id;
            this.question = question;
            this.theme_id = theme_id;
            this.isPublic = isPublic;
            this.user_id = user_id;
        }

        static fromObject(obj) {
            return new Question(obj.id, obj.question, obj.theme_id, obj.isPublic, obj.user_id);
        }
    }

    class QuestionService {
        constructor(db) {
            this.db = db;
        }

        fetchQuestions() {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['questions', 'themes', 'history'], 'readonly');
                const questionsStore = transaction.objectStore('questions');
                const themesStore = transaction.objectStore('themes');
                const historyStore = transaction.objectStore('history');
                const request = questionsStore.getAll();

                request.onsuccess = (event) => {
                    const questions = event.target.result.map(Question.fromObject);
                    const themesMap = {};
                    const usageCountMap = {};
                    const averageScoresMap = {};

                    // Fetch all themes to map theme ids to theme names
                    const themesRequest = themesStore.getAll();
                    themesRequest.onsuccess = (event) => {
                        event.target.result.forEach(theme => {
                            themesMap[theme.id] = theme.name;
                        });

                        // Process history to count the usage and calculate average scores
                        const historyRequest = historyStore.getAll();
                        historyRequest.onsuccess = (event) => {
                            const historyEntries = event.target.result;

                            // Count the number of times each question is used in history
                            historyEntries.forEach(historyEntry => {
                                if (usageCountMap[historyEntry.question_id]) {
                                    usageCountMap[historyEntry.question_id]++;
                                } else {
                                    usageCountMap[historyEntry.question_id] = 1;
                                }

                                if (averageScoresMap[historyEntry.question_id]) {
                                    averageScoresMap[historyEntry.question_id].sum += historyEntry.accuracy_average;
                                    averageScoresMap[historyEntry.question_id].count++;
                                } else {
                                    averageScoresMap[historyEntry.question_id] = { sum: historyEntry.accuracy_average, count: 1 };
                                }
                            });

                            const questionsWithCountAndScores = questions.map(q => ({
                                ...q,
                                themeName: themesMap[q.theme_id] || 'Desconhecido',
                                usedCount: usageCountMap[q.id] || 0,
                                averageScore: averageScoresMap[q.id] ? averageScoresMap[q.id].sum / averageScoresMap[q.id].count : 0
                            }));

                            resolve(questionsWithCountAndScores);
                        };

                        historyRequest.onerror = (event) => {
                            console.error('Erro ao carregar histórico', event.target.errorCode);
                            reject(event.target.errorCode);
                        };
                    };

                    themesRequest.onerror = (event) => {
                        console.error('Erro ao carregar temas', event.target.errorCode);
                        reject(event.target.errorCode);
                    };
                };

                request.onerror = (event) => {
                    console.error('Erro ao buscar questões', event.target.errorCode);
                    reject(event.target.errorCode);
                };
            });
        }

        fetchThemes() {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['themes'], 'readonly');
                const themesStore = transaction.objectStore('themes');
                const request = themesStore.getAll();
        
                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };
        
                request.onerror = (event) => {
                    console.error('Erro ao buscar temas', event.target.errorCode);
                    reject(event.target.errorCode);
                };
            });
        }
        
        deleteQuestion(id) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['questions'], 'readwrite');
                const questionsStore = transaction.objectStore('questions');
                const request = questionsStore.delete(id);

                request.onsuccess = () => {
                    console.log(`Questão com id ${id} foi excluída com sucesso.`);
                    resolve();
                };            request.onerror = (event) => {
                    console.error(`Erro ao excluir questão com id ${id}`, event.target.errorCode);
                    reject(event.target.errorCode);
                };
            });
        }
    }
    
    function loadQuestions() {
        const dbOpenRequest = indexedDB.open('questBank', 1);
    
        dbOpenRequest.onsuccess = (event) => {
            const db = event.target.result;
            const questionService = new QuestionService(db);
    
            questionService.fetchQuestions()
                .then((questions) => {
                    const questionsTable = $('#questionsTable');
                    questionsTable.empty();
                    if(currentUser.type==1){
                        questionsTable.append(`
                            <thead>
                                <tr>
                                    <th class="col-4">Questão</th>
                                    <th class="col-2">Tema</th>
                                    <th class="col-2">Visibilidade</th>
                                    <th class="col-4">Ações</th>
                                </tr>
                            </thead>
                        `);
                    }else{
                        questionsTable.append(`
                            <thead>
                                <tr>
                                    <th class="col-8">Questão</th>
                                    <th class="col-4">Tema</th>
                                </tr>
                            </thead>
                        `);
                    }
                    let tbody = `<tbody>`;
                    questions.forEach((question) => {
                        if(currentUser.type!=1 && !question.isPublic){
                            return;
                        }

                        let row = `
                            <tr data-id="${question.id}">
                                <td>${question.question}</td>
                                <td>${question.themeName}</td>`;

                        if(currentUser.type==1){
                            question.visibility = 'Privada';
                            if(question.isPublic){
                                question.visibility = 'Pública';
                            }
                            row += `<td>${question.visibility}</td>
                                    <td>
                                        <button class="btn btn-outline-success btn-sm" onclick="viewCompleteHistory(${question.id})"`;
                                    if(question.usedCount == 0){
                                        row += `disabled`;
                                    }    
                                    row += `>Ver histórico (${question.usedCount})</button>
                                        <button class="btn btn-danger btn-sm delete" data-id="${question.id}">Excluir</button>
                                        <button class="btn btn-primary btn-sm" onclick="openModalNewUseQuestion(${question.id})">Novo uso</button>
                                    </td>
                                </tr>
                            `;
                        }
                        tbody += row;
                    });
                    tbody += `</tbody>`;
                    questionsTable.append(tbody);
    
                    $('.delete').on('click', function(event) {
                        event.preventDefault();
                        const id = Number($(this).data('id'));
                        const confirmation = confirm('Tem certeza de que deseja excluir esta questão?');
                        console.log(id);
                        if (confirmation) {
                            questionService.deleteQuestion(id)
                                .then(() => {
                                    // Remover a linha da tabela
                                    $(`tr[data-id="${id}"]`).remove();
                                })
                                .catch((err) => {
                                    console.error('Erro ao excluir questão', err);
                                });
                        }
                    });
    
                    // Adiciona o evento de exportação ao botão existente
                    $('#exportExcel').on('click', () => {
                        exportToExcel(questions);
                    });
    
                    // Adiciona o evento de exportação para o relatório de notas
                    $('#exportNotesReport').on('click', () => {
                        exportNotesReport(questions);
                    });
                })
                .catch((err) => {
                    console.error('Erro ao carregar questões', err);
                });
        };
    
        dbOpenRequest.onerror = (event) => {
            console.error('Erro ao abrir o banco de dados', event.target.errorCode);
        };
    }

    function loadThemes() {
        const dbOpenRequest = indexedDB.open('questBank', 1);
    
        dbOpenRequest.onsuccess = (event) => {
            const db = event.target.result;
            const questionService = new QuestionService(db);
    
            questionService.fetchThemes()
                .then((themes) => {
                    const themeSelect = $('#theme');
                    themeSelect.empty();
                    themes.forEach((theme) => {
                        const option = `<option value="${theme.id}">${theme.name}</option>`;
                        themeSelect.append(option);
                    });
                })
                .catch((err) => {
                    console.error('Erro ao carregar temas', err);
                });
        };
    
        dbOpenRequest.onerror = (event) => {
            console.error('Erro ao abrir o banco de dados', event.target.errorCode);
        };
    }    
    
    function exportToExcel(questions) {
        const sortedQuestions = [...questions].sort((a, b) => b.usedCount - a.usedCount);
        const workbook = XLSX.utils.book_new();
        const worksheetData = [
            ['Questão', 'Tema', 'Usada em Provas (vezes)'],
            ...sortedQuestions.map(q => [q.question, q.themeName, q.usedCount])
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório de Frequência');
        XLSX.writeFile(workbook, 'relatorio_frequencia.xlsx');
    }
    
    function exportNotesReport(questions) {
        // Ordena as questões pela média das notas de forma decrescente
        let sortedQuestions = [...questions].sort((a, b) => b.averageScore - a.averageScore);
        sortedQuestions = sortedQuestions.filter((question) => question.averageScore > 0);
        const workbook = XLSX.utils.book_new();
        const worksheetData = [
            ['Questão', 'Tema', 'Média de Notas'],
            ...sortedQuestions.map(q => [q.question, q.themeName, q.averageScore.toFixed(2)])
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório de Aproveitamento');
        XLSX.writeFile(workbook, 'relatorio_aproveitamento.xlsx');
    }

    function initializeNewQuestionModal() {
        document.getElementById('content').value = '';
        $('#successSection').text('');
        $('#errorSection').text('');

        $('#newQuestionModal').on('show.bs.modal', () => {
            loadThemes();
        });
    
        $('#newQuestion').on('click', () => {
            const questionContent = $('#content').val();
            const selectedTheme = $('#theme').val();
            const visibility = $('#visibility').is(':checked');
    
            if (questionContent.trim() === '') {
                $('#errorSection').text('O enunciado não pode estar vazio.');
                return;
            }
    
            const dbOpenRequest = indexedDB.open('questBank', 1);
    
            dbOpenRequest.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['questions'], 'readwrite');
                const questionsStore = transaction.objectStore('questions');
    
                const newQuestion = {
                    question: questionContent,
                    theme_id: Number(selectedTheme),
                    visibility: visibility,
                    user_id: currentUser.id // Supondo que o ID do usuário seja 1, altere conforme necessário
                };
    
                const request = questionsStore.add(newQuestion);
    
                request.onsuccess = () => {
                    document.getElementById('content').value = '';
                    $('#successSection').text('Uso de questão salvo com sucesso.');
                    $('#errorSection').text('');
                    $('#newQuestionModal').modal('hide');
                    loadQuestions();
                    initializeNewQuestionModal();
                };
    
                request.onerror = (event) => {
                    console.error('Erro ao salvar novo uso de questão', event.target.errorCode);
                    $('#errorSection').text('Erro ao salvar novo uso de questão.');
                    $('#successSection').text('');
                };
            };
    
            dbOpenRequest.onerror = (event) => {
                console.error('Erro ao abrir o banco de dados', event.target.errorCode);
            };
        });
    }  

    function initializeNewUseQuestionModal() {
        document.getElementById('question_use_date').value = '';
        document.getElementById('question_use_class').value = '';
        document.getElementById('question_use_accuracy').value = '';
        document.getElementById('question_use_observations').value = '';
        $('#newUseQuestionSuccessSection').text('');
        $('#newUseQuestionErrorSection').text('');

        $('#newUseQuestion').on('click', () => {
            var data = {
                date: document.getElementById('question_use_date').value,
                class: document.getElementById('question_use_class').value,
                accuracy_average: document.getElementById('question_use_accuracy').value,
                observations: document.getElementById('question_use_observations').value,
                question_id: document.getElementById('question_use_question_id').value,
                user_id: document.getElementById('question_use_user_id').value
            };
    
            if (data.date === null || data.class === '' || data.accuracy_average === null) {
                $('#newUseQuestionErrorSection').text('Todos os campos devem ser preenchidos.');
                return;
            }
        
            return new Promise((resolve, reject) => {
                var request = indexedDB.open('questBank', 1);
        
                request.onsuccess = function(event) {
                    var db = event.target.result;
                    var transaction = db.transaction(['history'], 'readwrite');
                    var historyStore = transaction.objectStore('history');
                    
                    var newRecord = {
                        question_id: parseInt(data.question_id),
                        user_id: parseInt(data.user_id),
                        date: data.date,
                        class: data.class,
                        accuracy_average: data.accuracy_average,
                        observations: data.observations
                    };
        
                    var addRequest = historyStore.add(newRecord);
        
                    addRequest.onsuccess = () => {
                        $('#newUseQuestionSuccessSection').text('Uso de questão salvo com sucesso.');
                        $('#newUseQuestionErrorSection').text('');
                        $('#newUseQuestionModal').modal('hide');
                        loadQuestions();
                        initializeNewUseQuestionModal();
                    };
        
                    addRequest.onerror = (event) => {
                        console.error('Erro ao salvar a nova questão', event.target.errorCode);
                        $('#newUseQuestionErrorSection').text('Erro ao salvar a nova questão.');
                        $('#newUseQuestionSuccessSection').text('');
                    };
                };
        
                request.onerror = function(event) {
                    reject('Erro ao abrir o banco de dados');
                };
            });
        });
    }    
    
    loadQuestions();
    initializeNewQuestionModal();
    initializeNewUseQuestionModal();        

});

async function openModalNewQuestion() {
    $('#newQuestionModal').modal('toggle');
}

async function openModalNewUseQuestion(question_id) {
    $('#newUseQuestionModal').modal('toggle');
    document.getElementById('question_use_question_id').value = question_id;
    document.getElementById('question_use_user_id').value = currentUser.id;
}
