
/**
 * Module dependencies.
 */
var express = require('express');
var cradle = require('cradle');
var faye = require('faye');
var cluster = require('cluster');

if(cluster.isMaster) {
  // Fork workers.
	var numWorkers = 3;
	//var numWorkers = require('os').cpus().length;
  for (var i = 0; i < numWorkers; i++) { cluster.fork(); }

  cluster.on('death', function(worker) {
    console.log('worker ' + worker.pid + ' died');
		cluster.fork();
  });
} else {
	var app = module.exports = express.createServer();
	var db = new(cradle.Connection)().database('votr', { 
		auth: { username: 'marko', password: 'password' }
	});

	// faye Setup
	var fayeServer = new faye.NodeAdapter({ mount: '/faye', timeout: 45 })
	fayeServer.attach(app);
	var fayeClient = new faye.Client('http://localhost:3000/faye')

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
		if (typeof(req.session.name) == 'undefined') { 
			 req.session.name = (req.cookies.voter_name ? req.cookies.voter_name : ''); 
		} else {
			res.cookie('voter_name', req.session.name, { maxAge: 900000 });
		}
		db.view('by_item/rolling', { group_level: 1 }, function (db_err, db_res) {
			res.render('index', { title: "Rankings over the last 14 days", votes: db_res, name: req.session.name });
		});
	});

	// TODO switch view based on display type
	app.post('/vote/:id', function(req, res){
		req.session.name = (req.body.name != 'Unknown' ? req.body.name : '');
		db.save( { item: req.params.id || req.body.item, name: req.body.name, date: new Date() }, function (db_err, db_res) {
			console.log("Added vote to database", { id: req.params.id, name: req.body.name });
			db.view('by_item/rolling', { group_level: 1, key: [ req.params.id ] }, function (db_err, db_res){
				fayeClient.publish('/votes', { item: db_res[0].key[0], votes: db_res[0].value });
				res.send({ item: db_res[0].key[0], votes: db_res[0].value });
			});
		});
	});

	app.get('/autocomplete/:filter?', function(req, res){
		db.view('by_item/total',  { group_level: 1 }, function (db_err, db_res){
			var items = Array();
			for(i in db_res){ 
				if(db_res[i].key[0] )
				items[i] = db_res[i].key[0]; 
			}
			res.send(items);
		});
	});

	app.listen(3000);
}