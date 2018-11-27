const moment = require('moment');
const {pipe,pick,map,addIndex} = require('ramda');
const mapWithIndex = addIndex(map);

const csv =require("csvtojson");

const mapping = r => ({
  date: r.timestamp && moment(r.timestamp).add(-2,'hours').toISOString(),
  message: r.statement,
  ...r,
})

// inefficient to split then parse.... better to use transducer /stream
const parse = opts => csvStr => csv({
  //noheader:true,
  //output: "csv" 
})
.fromString(csvStr)
//.then((json)=>{console.log("pre mapping",json);return json})
.then(pipe(
  map(mapping),
  map(pick(['date','timestamp','name',"database_name",'duration','sql_text','message'])),     //temporary
))
//.then((json)=>{console.log("post mapping", json);return json})
.catch(e=>console.error("error parsing CSV",e))

module.exports = parse;