document.addEventListener('DOMContentLoaded', async () => {
  openDatabase();

  // Espera o banco de dados estar pronto
  setTimeout(runTests, 1000); // Ajuste o tempo conforme necessário para garantir que o banco esteja pronto
});

function displayResult(testName, success) {
  const resultsDiv = document.getElementById('results');
  const resultDiv = document.createElement('div');
  resultDiv.className = `test-result ${success ? 'success' : 'failure'}`;
  resultDiv.textContent = `${testName}: ${success ? 'Sucesso' : 'Falha'}`;
  resultsDiv.appendChild(resultDiv);
}

async function runTests() {
  await testAddQuestion();
  await testDeleteQuestion();
  await testDeleteThemeWithQuestions();
}

async function testAddQuestion() {
  const testName = 'Testar Adição de Questão';
  const mockQuestion = { question_id: 1000, question: 'Qual a capital da Itália?', theme_id: 1, isPublic: true, user_id: 1 };

  const transaction = db.transaction(['questions'], 'readwrite');
  const questionsStore = transaction.objectStore('questions');
  const addRequest = questionsStore.add(mockQuestion);

  await new Promise((resolve, reject) => {
      addRequest.onsuccess = resolve;
      addRequest.onerror = reject;
  });

  const cursorRequest = questionsStore.openCursor(null, 'prev');

  const lastQuestion = await new Promise((resolve, reject) => {
      cursorRequest.onsuccess = function(event) {
          const cursor = event.target.result;
          if (cursor) {
              resolve(cursor.value);
          } else {
              reject('No questions found');
          }
      };
      cursorRequest.onerror = reject;
  });

  const success = lastQuestion.question === mockQuestion.question &&
                  lastQuestion.theme_id === mockQuestion.theme_id &&
                  lastQuestion.isPublic === mockQuestion.isPublic &&
                  lastQuestion.user_id === mockQuestion.user_id;

  displayResult(testName, success);
}

async function testDeleteQuestion() {
  const testName = 'Testar Exclusão de Questão';
  const questionIdToDelete = 1000; // Supondo que o ID da questão a ser deletada seja 1

  const transaction = db.transaction(['questions'], 'readwrite');
  const questionsStore = transaction.objectStore('questions');
  const deleteRequest = questionsStore.delete(999);

  await new Promise((resolve, reject) => {
      deleteRequest.onsuccess = resolve;
      deleteRequest.onerror = reject;
  });

  const getRequest = questionsStore.get(questionIdToDelete);

  const deletedQuestion = await new Promise((resolve, reject) => {
      getRequest.onsuccess = function(event) {
          resolve(event.target.result);
      };
      getRequest.onerror = reject;
  });

  const success = deletedQuestion === undefined;
  displayResult(testName, success);
}

async function testDeleteThemeWithQuestions() {
  const testName = 'Testar Exclusão de Tema com Questões Associadas';
  const themeIdToDelete = 1000; // Supondo que o ID do tema a ser deletado seja 1

  const transaction = db.transaction(['themes', 'questions'], 'readwrite');
  const themesStore = transaction.objectStore('themes');
  const deleteThemeRequest = themesStore.delete(themeIdToDelete);

  await new Promise((resolve, reject) => {
      deleteThemeRequest.onsuccess = resolve;
      deleteThemeRequest.onerror = reject;
  });

  const questionsStore = transaction.objectStore('questions');
  const questionsIndex = questionsStore.index('theme_id');
  const cursorRequest = questionsIndex.openCursor(IDBKeyRange.only(themeIdToDelete));

  const deletePromises = [];
  cursorRequest.onsuccess = function(event) {
      const cursor = event.target.result;
      if (cursor) {
          deletePromises.push(new Promise((resolve, reject) => {
              const deleteRequest = cursor.delete();
              deleteRequest.onsuccess = resolve;
              deleteRequest.onerror = reject;
          }));
          cursor.continue();
      } else {
          Promise.all(deletePromises).then(() => {
              const countRequest = questionsStore.count(IDBKeyRange.only(themeIdToDelete));
              countRequest.onsuccess = function(event) {
                  const count = event.target.result;
                  const success = count === 0;
                  displayResult(testName, success);
              };
          });
      }
  };
  cursorRequest.onerror = function(event) {
      displayResult(testName, false);
  };
}
