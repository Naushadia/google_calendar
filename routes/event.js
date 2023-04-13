var express = require('express');
var router = express.Router();
var eventsController = require('../controller/eventController')

/* GET users listing. */
router.get("/new", (req,res) => {
  res.render('events');
});

router.post('/new',eventsController.addEvent);

module.exports = router;
