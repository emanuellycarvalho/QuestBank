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
            questionsStore.createIndex('user_id', 'user_id', { unique: false });
            questionsStore.createIndex('isPublic', 'isPublic', { unique: false });
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
    themesStore.add({ name: 'História' });
    themesStore.add({ name: 'Biologia' });
    themesStore.add({ name: 'Física' });
    themesStore.add({ name: 'Química' });
    themesStore.add({ name: 'Literatura' });
    themesStore.add({ name: 'Artes' });
    themesStore.add({ name: 'Filosofia' });
    themesStore.add({ name: 'Sociologia' });
    console.log('Tabela de temas povoada.');
}

function populateQuestions() {
    var transaction = db.transaction(['questions'], 'readwrite');
    var questionsStore = transaction.objectStore('questions');

    questionsStore.add({ question: 'Qual a capital do Brasil?', theme_id: 1, isPublic: false, user_id: 1 });
    questionsStore.add({ question: 'Quanto é 2 + 2?', theme_id: 2, isPublic: true, user_id: 1 });
    questionsStore.add({ question: 'Quem descobriu o Brasil?', theme_id: 3, isPublic: true, user_id: 1 });
    questionsStore.add({ question: 'Qual é a fórmula da água?', theme_id: 4, isPublic: true, user_id: 1 });
    questionsStore.add({ question: 'O que é a Terceira Lei de Newton?', theme_id: 5, isPublic: true, user_id: 1 });
    questionsStore.add({ question: 'Quem escreveu Dom Casmurro?', theme_id: 6, isPublic: true, user_id: 1 });
    questionsStore.add({ question: 'Qual a capital da França?', theme_id: 7, isPublic: true, user_id: 1 });
    questionsStore.add({ question: 'Quem pintou a Mona Lisa?', theme_id: 8, isPublic: true, user_id: 1 });
    questionsStore.add({ question: 'O que é a Democracia?', theme_id: 9, isPublic: true, user_id: 1 });
    questionsStore.add({ question: 'O que é a Teoria da Relatividade?', theme_id: 10, isPublic: true, user_id: 1 });
    console.log('Tabela de questões povoada.');
}

function populateUsers() {
    var transaction = db.transaction(['users'], 'readwrite');
    var usersStore = transaction.objectStore('users');

    usersStore.add({ name: 'Professor1', email: 'professor1@example.com', password: '123456', type: 1 });
    usersStore.add({ name: 'Professor2', email: 'professor2@example.com', password: '123456', type: 1 });
    usersStore.add({ name: 'Professor3', email: 'professor3@example.com', password: '123456', type: 1 });
    usersStore.add({ name: 'Aluno1', email: 'aluno1@example.com', password: '123456', type: 0 });
    usersStore.add({ name: 'Aluno2', email: 'aluno2@example.com', password: '123456', type: 0 });
    console.log('Tabela de usuários povoada.');
}

function populateHistory() {
    var transaction = db.transaction(['history'], 'readwrite');
    var historyStore = transaction.objectStore('history');

    for (let i = 1; i <= 30; i++) {
        historyStore.add({ question_id: Math.floor(Math.random() * 10) + 1, user_id: Math.floor(Math.random() * 5) + 1, date: `2024-03-${i < 10 ? '0' + i : i}`, class: `T${i % 5}`, accuracy_average: Math.floor(Math.random() * 100), observations: `Observações para o histórico ${i}` });
    }

    console.log('Tabela de histórico de uso povoada.');
}