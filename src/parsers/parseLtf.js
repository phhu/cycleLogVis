const {pipe,split,map,tail,addIndex,init,filter,test} = require('ramda');
const moment = require('moment');

const re = /^(\S+ \S+) (\S+) (\S+) (\S+) (\S+) (.*)$/muis;   

// given a log line, spit out an object
const mapping = (fixedProps,index,m) => ({
  ...fixedProps
  ,index
  //,dateRaw: m[1]
  ,date: m[1] && moment(m[1]).toISOString()
  ,dateRaw: m[1]
  ,category: m[2]
  ,type: m[3]
  ,class: m[4]
  ,codeLine: m[5]
  ,message: m[6]
  //,date: m[1] && moment(m[1], "MM-DD-YYYY hh:mm:ss A").add(-4, 'hours').format()
  //,type: m[5]
  //,processId: m[6]
  //,threadId: m[7]
  //,message: m[8] && m[8].trim()
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
  split(/^(?=\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/m)    // start of line, look forward for date time
  //,init
  ,mapWithIndex(parser(opts))
  //,filter(row => test(/frazer/i,row.message))
);  

module.exports = parse;