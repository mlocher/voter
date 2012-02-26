# Voter

Voter is a simple voting app, based on node.js, couchdb and faye for live updates. 

At the moment it simply displays a list of all the votes from most voted for to least voted for. A click on any element adds a new vote to the database, as does manually entering the value into the textbox at the end of the list.

Installation should be straightforward, you obviously need node and couchdb, install the dependencies via `npm install`, set up the database and adjust the database configuration in app.js

If you have any questions, feel free to ask me at marko.locher@gmail.com
