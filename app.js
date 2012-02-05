
/**
 * Module dependencies.
 */

var express = require('express');
var cradle = require('cradle');
var faye = require('faye');

var db = new(cradle.Connection)().database('votr', { 
	auth: { username: 'marko', password: 'password' }
});
//var db = new(cradle.Connection)('https://couch.io', 443, {
//	auth: { username: 'john', password: 'fha82l' }
//});

fayeServer = new faye.NodeAdapter({ mount: '/faye', timeout: 45 });
var fayeClient = new faye.Client('http://localhost:3000/faye');

// TODO does not work :(
db.exists(function (err, exists) {
	if (err) {
		console.log('error', err);
	} else if (exists) {
		console.log('Database already exists. Nothing to do here!');
	} else {
		console.log('Creating database and design documents.');
		db.create();
		db.save('_design/by_item', {
	   "language": "javascript",
	   "views": {
	       "total": {
	           "map": "function(d) { if(d.item) { emit([d.item, d.name], 1); } }",
	           "reduce": "function(k,v) { return sum(v); }"
	       },
	       "rolling": {
	           "map": "function(d) { if(d.item) { s = new Date(new Date().setDate(new Date().getDate() - 14)); v = new Date(d.date); if(s<v) { emit([d.item], 1); } } }",
	           "reduce": "function(k,v) { return sum(v); }"
		}}});
}});

var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ secret: "damooQuah6aeDo8Oiquieyohlaichung" }));
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
// TODO Rewrite setting of cookies, right now it depends on reloading the 
// front page
app.get('/', function(req, res){
	console.log("Cookies:", req.cookies)
	if (typeof(req.session.name) == 'undefined') { 
		 req.session.name = (req.cookies.voter_name ? req.cookies.voter_name : ''); 
	} else {
		res.cookie('voter_name', req.session.name, { maxAge: 900000 });
	}
	db.view('by_item/rolling', { group_level: 1 }, function (db_err, db_res) {
		res.render('index', {
			title: "Rankings over the last 14 days",
			votes: db_res, 
			name: req.session.name
		});
	});
});

// TODO switch view based on display type
app.post('/vote/:id', function(req, res){
	req.session.name = (req.body.name != 'Unknown' ? req.body.name : '');
	db.save( { item: req.params.id || req.body.item, name: req.body.name, date: new Date() }, function (db_err, db_res) {
		console.log("Added vote to database", { id: req.params.id, name: req.body.name });
		db.view('by_item/rolling', { group_level: 1, key: [ req.params.id ] }, function (db_err, db_res){
			fayeClient.publish('/votes', { item: db_res[0].key[0], votes: db_res[0].value });
			res.cookie('voter_votes', 1);
			res.send({ item: db_res[0].key[0], votes: db_res[0].value });
		});
	});
});

app.get('/autocomplete/:filter?', function(req, res){
	db.view('by_item/total',  { group_level: 1 }, function (db_err, db_res){
		var items = Array();
		for(i in db_res){ items[i] = db_res[i].key[0]; }
		res.send(items);
	});
});

fayeServer.attach(app);
app.listen(3000);
console.log("Express server listening on port %d", app.address().port);
