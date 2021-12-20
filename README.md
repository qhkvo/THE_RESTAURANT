#2406_A4
#Author: Quynh Vo
RESTAURANTS WEBSITE

In terminal :
    First terminal: Run Mongod
        1. 'mongod --dbpath=<dirname>'

    Second terminal: Run program
        1. `npm install`: install dependencies
        2. `node database-initializer.js`
        3. `node server.js`
        4. click the http link

In the web page:
    1. click the page that is matched your desire in the header:
        If Logged In:
        - home: home page
        - users: list of users, click one to see their order history
        - order form: to make an order
        - profile: logged in user's profile
        - logout: to logout 

        If Not Logged in:
        - to login: enter username and password into the text boxes
        - registration: to register a new account
        - home: home page
        - users: list of users, click one to see their order history

'mongo' in terminal:
- show dbs
- a4
- use a4
- show collections
- db.users.find() : to find all of users in the users collection

