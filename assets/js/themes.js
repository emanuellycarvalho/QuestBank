$(document).ready(() => {
    class Theme {
      constructor(id, name) {
        this.id = id;
        this.name = name;
      }
  
      static fromObject(obj) {
        return new Theme(obj.id, obj.name);
      }
    }
  
    class ThemeService {
      constructor(db) {
        this.db = db;
      }
  
      fetchThemes() {
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction(['themes'], 'readonly');
          const objectStore = transaction.objectStore('themes');
          const request = objectStore.getAll();
  
          request.onsuccess = (event) => {
            const themes = event.target.result.map(Theme.fromObject);
            resolve(themes);
          };
  
          request.onerror = (event) => {
            console.error('Erro ao buscar temas', event.target.errorCode);
            reject(event.target.errorCode);
          };
        });
      }

      deleteTheme(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['themes', 'questions'], 'readwrite');
            
            const themesStore = transaction.objectStore('themes');
            const questionsStore = transaction.objectStore('questions');
    
            // Delete the theme
            const themeRequest = themesStore.delete(id);
    
            themeRequest.onsuccess = () => {
                console.log(`Tema com id ${id} foi excluído com sucesso.`);
    
                // Delete the questions associated with the theme
                const index = questionsStore.index('theme_id');
                const range = IDBKeyRange.only(id);
    
                const deleteAssociatedQuestions = () => {
                    return new Promise((resolve, reject) => {
                        const cursorRequest = index.openCursor(range);
    
                        cursorRequest.onsuccess = (event) => {
                            const cursor = event.target.result;
                            if (cursor) {
                                // Verificar se a questão pertence ao tema que estamos excluindo
                                if (cursor.value.theme_id === id) {
                                    const deleteRequest = cursor.delete();
                                    deleteRequest.onsuccess = () => {
                                        console.log(`Questão com id ${cursor.value.id} foi excluída.`);
                                        cursor.continue();
                                    };
                                    deleteRequest.onerror = (event) => {
                                        console.error(`Erro ao excluir questão com id ${cursor.value.id}`, event.target.errorCode);
                                        reject(event.target.errorCode);
                                    };
                                } else {
                                    // Se não pertencer ao tema, continue para a próxima questão
                                    cursor.continue();
                                }
                            } else {
                                resolve();
                            }
                        };
    
                        cursorRequest.onerror = (event) => {
                            console.error(`Erro ao abrir cursor para excluir questões associadas ao tema com id ${id}`, event.target.errorCode);
                            reject(event.target.errorCode);
                        };
                    });
                };
    
                deleteAssociatedQuestions()
                    .then(() => {
                        console.log(`Todas as questões associadas ao tema com id ${id} foram excluídas.`);
                        resolve();
                    })
                    .catch((error) => {
                        console.error('Erro ao excluir questões associadas:', error);
                        reject(error);
                    });
            };
    
            themeRequest.onerror = (event) => {
                console.error(`Erro ao excluir tema com id ${id}`, event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }
            
    
    }
  
    function loadThemes() {
      const dbOpenRequest = indexedDB.open('questBank', 1);
  
      dbOpenRequest.onsuccess = (event) => {
        const db = event.target.result;
        const themeService = new ThemeService(db);
  
        themeService.fetchThemes()
          .then((themes) => {
            const tableBody = $('#themesTableBody');
            tableBody.empty();
  
            themes.forEach((theme) => {
              let row = `
                <tr data-id="${theme.id}">
                  <td>${theme.name}</td>`;
                if(currentUser.type==1){
                  row += `<td>
                            <button class="teachersOnly btn btn-danger btn-sm delete" data-id="${theme.id}">Excluir</button>
                        </td>`;
                }
                row += `</tr>`;
              tableBody.append(row);
            });

            $('.delete').on('click', function(event) {
                event.preventDefault();
                const id = Number($(this).data('id'));
                const confirmation = confirm('Tem certeza de que deseja excluir este tema e todas as suas questões associadas?');
                console.log(id);
                if (confirmation) {
                  themeService.deleteTheme(id)
                    .then(() => {
                      // Remover a linha da tabela
                      $(`tr[data-id="${id}"]`).remove();
                    })
                    .catch((err) => {
                      console.error('Erro ao excluir tema', err);
                    });
                }
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
  
    loadThemes();

    if(currentUser.type==1){
        const header_tabela = $('#header-tabela');
        header_tabela.append(`<th>Ações</th>`);

      const barra_superior = $('#barra-superior');
      barra_superior.append(`<button class="btn btn-light">Novo Tema</button>`);
  }
  });
  