const {pipe,split,map,tail,addIndex,init,filter} = require('ramda');
const moment = require('moment');

const re = /^(.*?)((\d{2,4}[\-\/]\d{2,4}[\-\/]\d{2,4})[ T](\d{1,2}[:]\d{2}[:]\d{2}))?(.*)$/muis;   

// given a log line, spit out an object
const mapping = (fixedProps,index,m) => ({
  ...fixedProps
  ,index
  //,dateRaw: m[1]
  ,date: m[2] && moment(m[3]).toISOString()
  ,dateRaw: m[3]
  ,timeRaw: m[4]
  ,dateTimeRaw: m[2]
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
  split(/\n/m)
  ,init
  ,mapWithIndex(parser(opts))
);  

module.exports = parse;