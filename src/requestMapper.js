// this fills a request object with properties, generally based on url

import {pipe,omit,prop,map,ifElse,identity,has} from 'ramda';
const parseLog = require('./parseLog')({includeLine:false});
const getZip = require('./getZip');
const getJson = pipe(prop('text'),JSON.parse);


const logToData = name => data => ({name,data});
//const tapText = pipe(tap(x=>console.log(x)),prop('text'))

//depending on the ending of the URL, get additional properties for request
//depending on the ending of the URL, get additional properties for request
const requestPropsByType = {
  'json': req => ({
    transforms: [
      getJson
      //,ifElse(d=>(d && d[0] && d[0].name &&d[0].data),identity,logToData(req.url))
    ]
  }),
  'log': req => ({
    transforms:[
      prop('text'),
      parseLog,
      map(omit(['thread','weblogicName','logger'])),
      logToData(req.url)
    ]
  }),
  'zip': req => ({
    responseType: 'blob'
    ,transforms: [
      prop('body'),
      getZip({transform:pipe(
        parseLog,
        logToData(req.url)
      )})
    ] 
  })
};

const getExtensionFromUrl = url => url.replace(/^.*\.(.*?)$/,"$1");

export const requestMapper = req => ({
  category: req.url
  //,type: getType(req.url)
  ,...requestPropsByType[getExtensionFromUrl(req.url)](req)
  ,...req
});
