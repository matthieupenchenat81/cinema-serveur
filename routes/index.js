var express = require('express');
var router = express.Router();
var DataService = require('../public/javascripts/DataService.js')();

/* 
  TODO HTML list of endpoints
 */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/scenes', function (req, res, next) {

  DataService.getScenes()
    .then(function (body) {
      res.send(body);
    })
    .catch(function (err) {
      console.log(err);
    });
});

router.get('/movies', function (req, res, next) {

  DataService.getMovies()
    .then(function (body) {
      res.send(body);
    })
    .catch(function (err) {
      console.log(err);
    });
});

module.exports = router;
