// HANDLE USER'S PRIVACY
function updatePrivacy() {
    const private = document.getElementById("private");

    let req = new XMLHttpRequest();

    req.onreadystatechange = function(){
        if(this.readyState == 4){
            if (this.status == 201) {
                alert('Saved successfully.');
            } else {
                alert('Error while saving.');
            }
        }
    }

    req.open("PUT", '');
    req.setRequestHeader("Content-Type", "application/json");
    req.send(JSON.stringify({ privacy: private.checked }));
}