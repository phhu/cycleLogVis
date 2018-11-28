const R = require('ramda')
  ,xml2js = require('xml2js')
  ,moment = require('moment')    //needs to be replaces with date-fns
  //,{parse,format} = require('date-fns')
;

// *** xml to json
// see https://www.npmjs.com/package/xml2js for options 
const xmlOpts = {
  explicitRoot:0
  ,mergeAttrs:1
  ,explicitArray:0
  ,normalizeTags:1
  ,strict:false
};
//const xmlToJson = xml => xml2js.parseString(xmlOpts)(xml); 
//const stringifyJSON = x=>JSON.stringify(x,null,2);
//const logJson = R.tap(R.pipe(stringifyJSON,console.log)); 

const parseJavaConsoleLogXml = ({
}={}) => xml => new Promise((resolve,reject)=> {
  xml2js.parseString(xml+'</log>' , xmlOpts,(err,result) => {
    if (err){reject(err);}
    const pipe = R.pipe(
      x=> x.record
      ,R.map(r => ({
        ...r
        ,date: moment(parseInt(r.millis) / 1).add(0,'hours').toISOString()
        ,message:r.message.trim() 
      }))
      ,R.map(R.omit([
        'logger','class','method'
      ]))
    );
    resolve(pipe(result));
  }); 
});  

module.exports = 
  parseJavaConsoleLogXml
;