const isNumeric = n => (!isNaN(parseFloat(n)) && isFinite(n));
const quote = s => isNumeric(s) ? s : `'${s}'`;
const substituteParam = (query,param) => query.replace(/\?/,quote(param.value));
const onlyUnique = (value, index, self) => self.indexOf(value) === index;	

const queryRe = /^(?:Query stmt is *|ENTER: createRowset\(')([\s\S]*)(?:'[\d, ]*\)|, parameters are \{([\s\S]*)\}\s*)$/i;
const paramRe = /(\d+)=Type is (.*?), Value is (.*?)(?=, \d+=Type|$)/g;

const processRow = row => { 
  const m = queryRe.exec(row.message);
  if (m !== null){
    row.sql=m[1];
    const params = [];
    let pp;
    while (( pp = paramRe.exec(m[2])) !== null){
      params.push({
        index:pp[1]
        ,type:pp[2]
        ,value:pp[3]
      });
    }
    row.sqlWithParams = m[2] ? params.reduce(substituteParam,row.sql) : m[1];
  } else {
    row.sql = null;
    row.sqlWithParams = null;
  }
  return row;
}     

module.exports = {
  parseSqlFromMessage: processRow
}