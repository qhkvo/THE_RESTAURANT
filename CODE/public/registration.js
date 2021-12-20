//HANDLE REGISTRATION REQUEST
function signUp() {
    const username = document.getElementById("regUsername").value;
    const password = document.getElementById("regPassword").value;

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
            if (this.status == 201) {
                alert("New account created");

                const userID = req.responseText;
                console.log(userID);
                
                window.location.replace(`/users/${userID}`);
            } else if (this.status == 409) {
                alert("This username is taken");
            }
        }
    }

    let data ={
        "username": username,
        "password":password,
        "privacy": false
    }
    
    req.open("POST", "/registration");
    req.setRequestHeader("Content-Type", "application/json");
    req.send(JSON.stringify(data));	  
}