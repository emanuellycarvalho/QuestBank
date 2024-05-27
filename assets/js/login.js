function handleLogin(){
    var email = document.querySelector('#email').value;
    var password = document.querySelector('#password').value;

    var transaction = db.transaction(['users'], 'readwrite');
    var usersStore = transaction.objectStore('users');
    var request = usersStore.index('email').get(email);

    request.onsuccess = function(event) {
        var user = request.result;
        if (user) {
            if (user.password === password) {
                success('Login bem-sucedido', user);
            } else {
                console.error('Senha incorreta');
                document.getElementById('errorSection').textContent = 'Senha incorreta';
            }
        } else {
            var displayName = prompt('Como você deseja ser chamado?');
            var isTeacher = confirm('Você é professor(a)? Clique em OK para sim e Cancelar para não.');
            var newUser = { name: displayName, email: email, password: password, type: isTeacher ? 1 : 2 };
            var addUserRequest = usersStore.add(newUser);

            addUserRequest.onsuccess = function() {
                success('Conta criada com sucesso', newUser);
            };

            addUserRequest.onerror = function() {
                console.error('Erro ao criar conta');
                document.getElementById('errorSection').textContent = 'Erro ao criar conta';
            };
        }
    };

    request.onerror = function(event) {
        console.error('Erro ao buscar usuário', event.target.errorCode);
    };    
}

function success(message, user){
    console.log(message);
    window.location.href = '../index.html';
    localStorage.setItem('isLoggedIn', true);
    localStorage.setItem('currentUser', JSON.stringify(user));
}