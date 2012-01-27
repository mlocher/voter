
/**
 * Module dependencies.
 */

var express = require('express');
var cradle = require('cradle');

var db = new(cradle.Connection)().database('votr');
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
app.get('/', function(req, res){
	if (typeof(req.session.name) == 'undefined') { req.session.name = ''; }
	db.view('by_item/rolling', { group_level: 1 }, function (db_err, db_res) {
		console.log("View rolling standings");
		res.render('index', {
			title: "Rankings over the last 14 days",
			votes: db_res, 
			name: req.session.name
		});
	});
});

// TODO limit voting within time interval
// TODO switch view based on display type
app.post('/vote/:id', function(req, res){
	req.session.name = (req.body.name != 'Unknown' ? req.body.name : '');
	db.save( { item: req.params.id || req.body.item, name: req.body.name, date: new Date() }, function (db_err, db_res) {
		console.log("Added vote to database", { id: req.params.id, name: req.body.name });
		db.view('by_item/rolling', { group_level: 1, key: [ req.params.id ] }, function (db_err, db_res){
			res.send({ item: db_res[0].key[0], votes: db_res[0].value });
		});
	});
});

app.listen(3000);
console.log("Express server listening on port %d", app.address().port);
