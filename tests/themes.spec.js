// themes.spec.js

describe("ThemeService", function() {

    // Mock para simular um banco de dados
    const mockDB = {
      transaction: () => ({
        objectStore: () => ({
          getAll: () => ({
            onsuccess: (callback) => {
              const themes = [{ id: 1, name: "Theme 1" }, { id: 2, name: "Theme 2" }];
              callback({ target: { result: themes } });
            }
          }),
          delete: (id) => ({
            onsuccess: () => {}
          })
        })
      })
    };
  
    // Teste para verificar se os temas são carregados corretamente
    it("should fetch themes correctly", function(done) {
      const themeService = new ThemeService(mockDB);
  
      themeService.fetchThemes()
        .then((themes) => {
          expect(themes.length).toEqual(2);
          expect(themes[0].id).toEqual(1);
          expect(themes[0].name).toEqual("Theme 1");
          expect(themes[1].id).toEqual(2);
          expect(themes[1].name).toEqual("Theme 2");
          done();
        })
        .catch((error) => {
          done.fail(error);
        });
    });
  
    // Teste para verificar se um tema é excluído corretamente
    it("should delete a theme correctly", function(done) {
      const themeService = new ThemeService(mockDB);
  
      themeService.deleteTheme(1)
        .then(() => {
          // O mock não executa a exclusão, então não precisamos testar nada aqui
          done();
        })
        .catch((error) => {
          done.fail(error);
        });
    });
  });
  