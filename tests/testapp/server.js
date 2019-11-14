const express = require('express')
const app = express()

app.use('/', express.static('app', {index: "index.html"}));

app.get('/', function (req, res) {
  res.sendFile('index.html', { root: '.' } );
})

app.listen(3020, function () {
  console.log('Example app listening on port 3020!')
})
