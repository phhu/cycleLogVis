function substituteParam (query,param){
  return query.replace(/\?/,"'" + param.value  + "'");
}
function onlyUnique(value, index, self) { 
 return self.indexOf(value) === index;
}			

const queryRe = /^(?:Query stmt is *|ENTER: createRowset\(')([\s\S]*)(?:'[\d, ]*\)|, parameters are \{([\s\S]*)\}\s*)$/i;
//const checkRuleRe = /^Checking rule [\s\S]*/;
//const exitTestRuleRe = /^EXIT:\stestRule[\s\S]*/;
//const deliverNotificationsRe = /^ENTER: deliverNotifications [\s\S]*/;

const paramRe = /(\d+)=Type is (.*?), Value is (.*?)(?=, \d+=Type|$)/g;
 
      // process queries
const processRow = l => { 
  l.sql = null;
  l.sqlWithParams = null;
  let m = queryRe.exec(l.message);
  if (m !== null){
    l.sql=m[1];
    const params = [];
    var pp;
    while (( pp = paramRe.exec(m[2])) !== null){
      params.push({
        index:pp[1]
        ,type:pp[2]
        ,value:pp[3]
      });
    }
    l.sqlWithParams = m[2] ? params.reduce((q,p)=>substituteParam(q,p),l.sql) : m[1];
  } else {}
  return l;
}     

const parseSqlFromMessage = row => {
  //row.sql = 'blah blah'; 
  return processRow(row);
}

module.exports = {
  parseSqlFromMessage
}