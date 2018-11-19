/*
const {runSql,close} = require('./runSql');

runSql('select * from bpconfig')
.then(res => console.log(JSON.stringify(res.recordset[0],null,2)))
.then(x=> close());
*/


var Connection = require('tedious').Connection;

var config = {
  userName: 'sa',
  password: 'Pa$$w0rd1!',
  server: 'localhost',
  
  // If you're on Windows Azure, you will need this:
  options: {encrypt: true}
};

var connection = new Connection(config);

connection.on('connect', function(err) {
  if (err){console.error(err)}
    console.log("connected");
    executeStatement();
  }
);

var Request = require('tedious').Request;

function executeStatement() {
  request = new Request("select * from bpmaindb.dbo.bpconfig", function(err, rowCount) {
    if (err) {
      console.log(err);
    } else {
      console.log(rowCount + ' rows');
    }
  });

  request.on('row', function(columns) {
    columns.forEach(function(column) {
      console.log(column.value);
    });
  });

  connection.execSql(request);
}
