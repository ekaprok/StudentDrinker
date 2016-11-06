var express = require('express');
var http = require('http');

var router = express();


//code from http://code.runnable.com/U0sU598vXio2uD-1/example-reading-form-input-with-express-4-0-and-body-parser-for-node-js
var bodyParser = require('body-parser');
router.use(bodyParser());

router.engine('html', require('ejs').renderFile);
router.set('view engine', 'ejs');



router.get('/', function(req, res){
  var html = '<form action="/" method="post">' +
               'Enter your ingredients:' +
               '<input type="text" name="ingredients" placeholder="..." />' +
               '<br>' +
               '<button type="submit">Submit</button>' +
            '</form>';
               
  res.send(html);
});

router.post('/', function(req, res){
  var ingredients = req.body.ingredients;
  var url = 'http://www.recipepuppy.com/api/?i=' + ingredients;
  http.get(url, function(res2){
    var body = '';
    res2.on('data', function(chunk){
        body += chunk;
    }).on('end', function(req, res2){
        var parsed = JSON.parse(body);
        console.log(parsed.results)

        res.render("../views/results.html", {data: parsed.results});
    });
  });  
});


module.exports = router
