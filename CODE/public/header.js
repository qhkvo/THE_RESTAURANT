// HANDLE LOGIN REQUEST
function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === "") {
        alert("Username cannot be empty.");
        return;
    } else if (password === "") {
        alert("Password cannot be empty.");
        return;
    }

    let req = new XMLHttpRequest();

    req.onreadystatechange = function(){
        if(this.readyState == 4){
            if (this.status == 200) {
                window.location.replace("/home");
            } else if (this.status == 401) {
                alert("Username or password is not correct.");
            }
        }
    }

    let data = {
        "username": username,
        "password": password
    }

    req.open("POST", "/login");
    req.setRequestHeader("Content-Type", "application/json");
    req.send(JSON.stringify(data));
}