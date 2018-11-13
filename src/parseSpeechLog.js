const {pipe,split,map,tail,addIndex,init,filter} = require('ramda');
const moment = require('moment');

/* SAMPLE:
10/24/2018 11:55:30 AM General Information Process Id: 24000 Thread Id: 22692
ExecSQL called. For database [CentralDWH],
sqlQuery=select category_id, category_name from categories with (nolock)
---
*/

const re = /^((\S+) (\S+) (\S+)) (.*) Process Id: (\d+) Thread Id: (\d+)\r\n(.*)$/muis;   

const mapping = (fixedProps,index,m) => ({
  ...fixedProps
  ,index
  //,dateRaw: m[1]
  ,date: m[1] && moment(m[1], "MM-DD-YYYY hh:mm:ss A").add(-4, 'hours').format()
  ,type: m[5]
  ,processId: m[6]
  ,threadId: m[7]
  ,message: m[8] && m[8].trim()
});

const parser = ({
  fixedProps = {}
  ,includeLine = true
} = {}) => (chunk,index) => {    
  const line = chunk.toString();
  const m = re.exec(line)||{input:line};
  ret = mapping(fixedProps,index,m);
  if(includeLine) { ret.line = m.input;}
  return ret;
}
const mapWithIndex = addIndex(map);

// inefficient to split then parse.... better to use transducer
const parse = opts => pipe(
  split(/^---\r\n/m)
  ,init
  ,mapWithIndex(parser(opts))
  //,filter(row=>row.index>45000)
);  

module.exports = parse;