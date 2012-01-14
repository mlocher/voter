
/**
 * Module dependencies.
 */

var express = require('express');
var cradle = require('cradle');

var db = new(cradle.Connection)().database('voter');
var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
app.get('/', function(req, res){
  res.render('index', {
    title: 'Express'
  });
});

app.get('/standings', function(req, res){
	db.view('votes/rolling_14', function (db_err, db_res) {
		res.render('rankings', {
			title: "Rankings",
			votes: db_res
		});
	});
});

// TODO don't create element if a element with this name already exists
// TODO convert to call this function via ajax
app.post('/vote/new', function(req, res){
	db.save(
		{ item: req.body.item, votes: [ {name: 'Marko Locher', date: new Date()} ] },
		function(db_err, db_res){
			console.log(db_res);
			res.redirect('/standings');
		}
	);
})

// TODO limit voting within time interval
app.post('/vote/:id', function(req, res){
	db.get(req.params.id, function(db_err, db_doc){
		db_doc.votes.push({name: req.body.name, date: new Date()})
		db.save(db_doc._id, db_doc);
		res.send({ _id: db_doc._id, item: db_doc.item, votes: db_doc.votes.length });
	});
})

app.listen(3000);
console.log("Express server listening on port %d", app.address().port);
