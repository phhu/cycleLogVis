function substituteParam (query,param){
  return query.replace(/\?/,"'" + param.value  + "'");
}
function onlyUnique(value, index, self) { 
 return self.indexOf(value) === index;
}			

const queryRe = /^(?:Query stmt is *|ENTER: createRowset\(')([\s\S]*)(?:'[\d, ]*\)|, parameters are \{([\s\S]*)\}\s*)$/i;
const paramRe = /(\d+)=Type is (.*?), Value is (.*?)(?=, \d+=Type|$)/g;
//const checkRuleRe = /^Checking rule [\s\S]*/;
//const exitTestRuleRe = /^EXIT:\stestRule[\s\S]*/;
//const deliverNotificationsRe = /^ENTER: deliverNotifications [\s\S]*/;

const processRow = row => { 
  row.sql = null;
  row.sqlWithParams = null;
  let m = queryRe.exec(row.message);
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
    row.sqlWithParams = m[2] ? params.reduce((q,p)=>substituteParam(q,p),row.sql) : m[1];
  }
  return row;
}     

module.exports = {
  parseSqlFromMessage: processRow
}