const express = require('express')
const app = express()

app.get('/', function (req, res) {
  res.send('<h2>This is node test app for junit-xml-plugin</h2>');
})

app.listen(3020, function () {
  console.log('Example app listening on port 3020!')
})
