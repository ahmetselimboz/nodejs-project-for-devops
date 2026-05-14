var express = require('express');
var fs = require('fs');

var router = express.Router();
let routes = fs.readdirSync(__dirname);

routes.forEach(route => {
  if (route.includes(".js") && route !== "index.js") {
    router.use(`/${route.replace(".js", "")}`, require(`./${route}`));
  }
});

module.exports = router;
