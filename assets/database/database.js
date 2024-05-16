function openDatabase() {
    var request = indexedDB.open('questBank', 1);

    request.onupgradeneeded = function(event) {
        var db = event.target.result;
        window.db = db;

        // Verifica se as tabelas já existem
        if (!db.objectStoreNames.contains('themes')) {
            var themesStore = db.createObjectStore('themes', { keyPath: 'id', autoIncrement: true });
            themesStore.createIndex('name', 'name', { unique: true });
        }

        if (!db.objectStoreNames.contains('questions')) {
            var questionsStore = db.createObjectStore('questions', { keyPath: 'id', autoIncrement: true });
            questionsStore.createIndex('question', 'question', { unique: false });
            questionsStore.createIndex('theme_id', 'theme_id', { unique: false });
            questionsStore.createIndex('private', 'private', { unique: false });
        }

        if (!db.objectStoreNames.contains('history')) {
            var historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
            historyStore.createIndex('question_id', 'question_id', { unique: false });
            historyStore.createIndex('user_id', 'user_id', { unique: false });
            historyStore.createIndex('date', 'date', { unique: false });
            historyStore.createIndex('class', 'class', { unique: false });
            historyStore.createIndex('accuracy_average', 'accuracy_average', { unique: false });
            historyStore.createIndex('observations', 'observations', { unique: false });
        }

        if (!db.objectStoreNames.contains('users')) {
            var usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
            usersStore.createIndex('name', 'name', { unique: false });
            usersStore.createIndex('email', 'email', { unique: true });
            usersStore.createIndex('password', 'password', { unique: false });
            usersStore.createIndex('type', 'type', { unique: false });
        }
    };

    request.onsuccess = async function(event) {
        db = event.target.result;

        console.log('Banco de dados aberto e funcionando');

        if (!(await tableHasRows('themes'))) {
            populateThemes();
        }
    
        if (!(await tableHasRows('questions'))) {
            populateQuestions();
        }

        if (!(await tableHasRows('users'))) {
            populateUsers();
        }
    
        if (!(await tableHasRows('history'))) {
            populateHistory();
        }
    };

    request.onerror = function(event) {
        console.error('Erro ao abrir o banco de dados', event.target.errorCode);
    };
}

function tableHasRows(tableName) {
    return new Promise((resolve, reject) => {
        var transaction = db.transaction([tableName], 'readonly');
        var objectStore = transaction.objectStore(tableName);
        var countRequest = objectStore.count();

        countRequest.onsuccess = function() {
            var count = countRequest.result;
            resolve(count > 0);
        };

        countRequest.onerror = function() {
            console.error('Erro ao verificar registros na tabela ' + tableName);
            reject(false);
        };
    });
}

function populateThemes() {
    var transaction = db.transaction(['themes'], 'readwrite');
    var themesStore = transaction.objectStore('themes');

    themesStore.add({ name: 'Geografia' });
    themesStore.add({ name: 'Matemática' });
    console.log('Tabela de temas povoada.');
}

function populateQuestions() {
    var transaction = db.transaction(['questions'], 'readwrite');
    var questionsStore = transaction.objectStore('questions');

    questionsStore.add({ title: 'Pergunta 1', question: 'Qual a capital do Brasil?', theme_id: 1, private: false });
    questionsStore.add({ title: 'Pergunta 2', question: 'Quanto é 2 + 2?', theme_id: 2, private: true });
    console.log('Tabela de questões povoada.');
}

function populateUsers() {
    var transaction = db.transaction(['users'], 'readwrite');
    var usersStore = transaction.objectStore('users');

    usersStore.add({ name: 'Professor', email: 'professor@example.com', password: '123456', type: 1 }); // type 1 para professor
    usersStore.add({ name: 'Aluno', email: 'aluno@example.com', password: '123456', type: 2 }); // type 2 para aluno
    console.log('Tabela de usuários povoada.');
}

function populateHistory() {
    var transaction = db.transaction(['history'], 'readwrite');
    var historyStore = transaction.objectStore('history');

    historyStore.add({ question_id: 1, user_id: 1, date: '2024-03-25', class: 'TZ', accuracy_average: 65, observations: 'Alunos tiveram dificuldade com esta questão.' });
    historyStore.add({ question_id: 2, user_id: 2, date: '2024-03-25', class: 'TM', accuracy_average: 90, observations: 'Questão respondida corretamente pela maioria dos alunos.' });
    console.log('Tabela de histórico de uso povoada.');
}