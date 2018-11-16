const {pipe,split,map,tail,addIndex,identity} = require('ramda');

const re = /^\[([^\]]*)\]-\[([^\]]*)\] \[([^\]]*)\] \[([^\]]*)\] \[(?:\[[A-Z]*\] )?([^\]]*)\] \[([^\]]*)\] \<##(.*)##\> - ([\s\S]*)$/mi;   
const userRe = /\[\{user=(.*)\}\]/;

const parser = ({
  fixedProps = {}
  ,includeLine = false
  ,transforms = false
} = {}) => (chunk,index) => {   
  const line = chunk.toString();
  const m = re.exec(line)||{input:line};
  const ret = ({
    ...fixedProps
    ,index
    ,date: new Date(m[3] && m[3]
      .replace(/,/,".")                             // decimal as point
      .replace(/(^[^\s]+\s[^\s]+)(\s.*)?$/,"$1")    // throw away time zone
    )
    ,dateRaw: m[3]
    ,weblogicName: m[1]
    ,component: m[2]
    ,level: m[4]
    ,thread: m[5]
    ,logger : m[6]
    ,user : m[7] && m[7].replace(userRe,"$1").trim()
    ,message: m[8] && m[8].trim()
  });
  if(includeLine) { ret.line = m.input;}
  return transforms ? pipe(...transforms)(ret) : ret;
}

module.exports = opts => pipe(
  split(/^####/m)
  ,tail
  ,addIndex(map)(parser(opts))
);  