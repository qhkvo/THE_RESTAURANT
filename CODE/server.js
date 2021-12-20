const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongo');
const mongo = require('mongodb');
let MongoClient = mongo.MongoClient;
let db;

const app = express();

//SESSION
let store = new MongoDBStore({   //create new connection
    mongoUrl: 'mongodb://localhost/a4',
    collection: 'sessions'
});
store.on('error', (error) => {console.log(error)});     //handle the error

//MIDDLEWARE
app.set("views");
app.set('view engine', 'pug');

app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));      //return req.body
app.use(express.json());  //get json obj

app.use(session({
    name: 'A4-session',
    secret:'shh it is a secret',
    store: store,
    resave: true,   //Update idle session to active, active sessions are not deleted
    saveUninitialized: false //Empty sessions are not stored
}))

//Log req received
app.use(function(req, res, next) {
    console.log(`${req.method} for ${req.url}`);
    next();
});

//ROUTES
app.use(exposeSession); //res.locals of any route will have access to req.session

app.get(['/', '/home'], (req, res) => res.render('pages/home'));

app.post('/login', login);
app.get('/logout', logout);

app.get('/users', usersList);
app.get('/users/:userID', sendUser);   
app.put('/users/:userID', updatePrivacy);

app.get('/orderform', auth, (req, res) => res.render('pages/orderform'));
app.post('/orders', auth, postOrder); //!!! add order to the database (client) 
app.get('/orders/:orderID', getOrder);

app.get('/registration', (req, res) => res.render('pages/registration'))
app.post('/registration', signUp);

//LOGIN
//Exposes session to template engine
//if there is a req session, set and save the session to res.locals
function exposeSession(req, res, next){
    if(req.session) 
        res.locals.session = req.session;
    next();
}

//Authorization. Can't access /orderform unless logged in
function auth(req,res,next) {
    if(!req.session.username || !req.session.loggedin) {
		res.status(401).send("You need to login to access this page.");
		return;
	}

	next();
}

//401: unauthorized - wrong password, username invalid
//403: Forbidden - user logged in but doesn't have privilege to access
function login(req, res, next){
    //Check if logged in
    if(req.session.loggedin){
        return res.status(200).send('Already logged in.');
    }

    const data = req.body;

    //If not
    let username = req.body.username;
	let password = req.body.password;

    if (!username || !password) {
        res.status(401).send("Not authorized. Invalid data.");
        return;
    }

    console.log("Logging in: ");
    console.log("Username: " + username);
    console.log("Password: " + password);

    db.collection("users").findOne({ "username": username }, function(err, result) {
        if (err) {
            res.status(500).send("Error reading database.");
			return;
        }

        if (result) {
            if (password === result.password) {
                //store the info
                req.session.loggedin = true;        //to keep track that user logged in
                req.session.username = username;    //store the current logged in username or result.username??
                req.session.userID = result._id.toString(); //???
                
                //res.locals: Make session data available to all view templates
                //don't have to res.render() every view templates
                res.locals.session = req.session;

                res.status(200).send("Logged in");
            } else {
                res.status(401).send("The password is not correct");
            }
        } else {
            res.status(401).send("The username is not correct");
        }
    });
}

//LOGOUT
function logout(req, res, next){
    console.log('logout');

	if (req.session.loggedin){
		req.session.loggedin = false;
        req.session.username = undefined;
        delete res.locals.session;

		res.status(200).redirect('/home');
	} else {
		res.status(401).send("You cannot log out because you aren't logged in.");
	}
}

//show users list (handle getting all username and ?name too)
//only appear public users (privacy: false)
function usersList(req, res, next){
    let query = req.query;

    //find all users first
    if (query.hasOwnProperty('name')){
        usersList = db.collection("users").find({username: {$regex: query.name, $options: 'i'}, privacy: false}).toArray((err, result) => {
            if(err) {
                res.status(500).send("Error reading database.");
                throw err;
            }

            res.status(200).render("pages/users", { users: result });
        });
    } else {
        db.collection("users").find({privacy: false}).toArray((err, result) => {
            if(err) {
                res.status(500).send("Error reading database.");
                throw err;
            }

            res.status(200).render("pages/users", { users: result });
        });
    }
}

//send to html
//profile, /users/:userID
function sendUser(req, res, next){
    const userID = req.params.userID;	

    db.collection("users").findOne({_id: mongo.ObjectId(userID)}, function(err, user) {
        if (err) {
            res.status(500).send("Error reading database.");
			return;
        }

        if (user) {
            if (userID != req.session.userID && user.privacy) {
                res.status(403).send(`Profile with ID=${userID} is private`);
                return;
            }

            db.collection("orders").find({username: user.username}).toArray(function(err, result) {
                if (err) {
                    res.status(500).send("Error reading database.");
                    return;
                }

                let orders = [];
                for (const order of result) {
                    orders.push(order._id.toString());
                }

                res.status(200).render("pages/profile", { ownProfile: userID == req.session.userID, user: user, orders: orders });
            });
        } else {
            res.status(404).send(`User with ID=${userID} was not found`);
        }
    });
}

//USER'S PRIVACY
function updatePrivacy(req, res, next) {
    const userID = req.params.userID;	
    const data = req.body;

    if (!data.hasOwnProperty("privacy")) {
        res.status(400).send("Invalid data.");
        return;
    }

    console.log(data.privacy);

    db.collection("users").updateOne({_id: mongo.ObjectId(userID)}, {$set: {privacy: data.privacy}}, function(err, result) {
        if(err) {
            res.status(500).send("Error reading database.");
            throw err;
        }

        res.status(201).send("Update successfully");
    });
}

//FOR 'orders/orderID'
function postOrder(req, res, next){
    const data = req.body;

    if (!data.hasOwnProperty("restaurantID") || !data.hasOwnProperty("restaurantName") || !data.hasOwnProperty("subtotal") || !data.hasOwnProperty("total") || !data.hasOwnProperty("fee") || !data.hasOwnProperty("tax") || !data.hasOwnProperty("order")) {
        res.status(400).send("Invalid data.");
        return;
    }

    data.username = req.session.username;

    db.collection("orders").insertOne(data, function(err, result) {
        if (err) {
            res.status(500).send("Error updating database.");
			return;
        }

        res.status(201).send(`Order places with _id=${result.insertedId.toString()}`);
    });
}

function getOrder(req, res, next) {
    const orderID = req.params.orderID;
    let orderOID;

    try {
        orderOID = mongo.ObjectId(orderID);
    } catch(err) {
        res.status(404).send(`Cannot find order with id=${orderID}`);
        return;
    }

    db.collection("orders").findOne({_id: orderOID}, function(err, order) {
        if (err) {
            res.status(500).send("Error updating database.");
			return;
        }

        if (order) {
            if (order.username === req.session.username) {
                res.status(200).render("pages/order", { order: order });
            } else {  
                db.collection("users").findOne({username: order.username}, function(err, result) {
                    if (err) {
                        res.status(500).send("Error updating database.");
                        return;
                    }

                    if (result.privacy) {
                        res.status(403).send(`Order with id=${orderID} is forbidden.`);
                    } else {
                        res.status(200).render("pages/order", { order: order });
                    }
                });
            }
        } else {
            res.status(404).send(`Cannot find order with id=${orderID}`);
        }
    });
}

function signUp(req, res, next){
    const body = req.body;

    //check validity
    if(!body.hasOwnProperty('username') || !body.hasOwnProperty("password")){
        res.status(400).send("Invalid data");
        return;
    }

    db.collection("users").findOne({username: body.username}, function(err, data) {
        if (err) {
            res.status(500).send("Error reading database.");
			return;
        }
        
        //if the username already exist
        if (data) {
            res.status(409).send("This username is taken");     
            return;
        }
        
        let user = {username: body.username, password: body.password, privacy: false};

        db.collection("users").insertOne(user, function(err, result){
            if (err) {
                res.status(500).send("Error reading database.");
                return;
            }

            req.session.loggedin = true;     
            req.session.username = body.username;    
            req.session.userID = result.insertedId.toString(); 

            res.status(201).send(user._id.toString());
        });

    })
}

// Initialize database connection / connect to mongodb
MongoClient.connect("mongodb://localhost/", function(err, client) {
  if(err) throw err;

  //Get the a4 database
  db = client.db('a4');

  // Start server once Mongo is initialized
  //inside mongo to connect to database before running the server
  app.listen(3000);
  console.log("http://localhost:3000");
});