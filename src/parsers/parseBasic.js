const moment = require('moment');
const {pipe,split,map,tail,addIndex,init,filter} = require('ramda');
const mapWithIndex = addIndex(map);

// hope there's a date somewhere on the line, followed by a time
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
  ,before: m[1]
  ,after: m[5]
});

const parser = ({mapping,re}) => ({
  fixedProps = {}
  ,includeLine = true
  ,transforms = false
} = {}) => (chunk,index) => {    
  const line = chunk.toString();
  const m = re.exec(line)||{input:line};
  const ret = mapping(fixedProps,index,m);
  if(includeLine) { ret.line = m.input;}
  return ret;
  //return transforms ? pipe(...transforms)(ret) : ret;
}

// inefficient to split then parse.... better to use transducer
const parse = opts => pipe(
  split(/\n/m)
  ,init
  ,mapWithIndex(parser({mapping,re})(opts))
);  

module.exports = parse;