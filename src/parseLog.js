const {pipe,split,map,tail,addIndex} = require('ramda');

const re = /^\[([^\]]*)\]-\[([^\]]*)\] \[([^\]]*)\] \[([^\]]*)\] \[(?:\[[A-Z]*\] )?([^\]]*)\] \[([^\]]*)\] \<##(.*)##\> - ([\s\S]*)$/mi;   
const userRe = /\[\{user=\<?(.*)\>?\}\]/;

const parser = ({
  fixedProps = {}
  ,includeLine = false
} = {}) => (chunk,index) => {   
  const line = chunk.toString();
  const m = re.exec(line)||{input:line};
  ret = ({
    ...fixedProps
    ,index
    ,weblogicName: m[1]
    ,component: m[2]
    ,dateRaw: m[3]
    ,date: new Date(m[3] && m[3].replace(/,/,"."))
    ,level: m[4]
    ,thread: m[5]
    ,logger : m[6]
    ,user : m[7] && m[7].replace(userRe,"$1").trim()
    ,message: m[8] && m[8].trim()
  });
  if(includeLine) { ret.line = m.input;}
  return ret;
}

module.exports = opts => pipe(
  split(/^####/m)
  ,tail
  ,addIndex(map)(parser(opts))
);  