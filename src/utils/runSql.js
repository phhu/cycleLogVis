//const mssql = require('mssql');
 const mssql = require('mssql/msnodesqlv8');

const dbConfig = {
	server: 'localhost', 
	database: 'bpmaindb',
  requestTimeout: 2 * 60 * 1000,
  connectionTimeout: 60 * 1000,
  //driver: "msnodesqlv8",
  options: {
      //tdsVersion: '7_3_B'
      trustedConnection: true
  },
  pool: {
      max: 15,
      min: 10,
      idleTimeoutMillis: 15000
  }
  ,user: 'sa', password: 'Pa$$w0rd1!',
};

/*
options: {
   trustedConnection: true,
   readOnlyIntent: true,
   ApplicationIntent: 'ReadOnly'
   //useUTC: true
}*/

//const constr = "Data Source=localhost,1433;User Id=sa;Password=Pa$$w0rd1!;Initial Catalog=BPMAINDB";

//const connectionPromise = mssql.connect(constr ).catch(e=>console.error);
let connectionPromise;
const open = () => connectionPromise = mssql.connect(dbConfig ).catch(e=>console.error);
const close = ()=>connectionPromise.then(con => con.close());

open();
 const runSql = async (str) => {
  //return [];
    try {
        const connection = await connectionPromise;    // will already be resolved second time around
        const request = new mssql.Request();
        request.multiple = true;
        console.log(str);
        return request.query(str)
    } catch (err) {
        console.error(err);
    }
}


module.exports = {
  runSql, close, open
}