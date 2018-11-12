// this fills a request object with properties, generally based on url

import xs from 'xstream';
import {pipe,omit,prop,map,ifElse,identity,has} from 'ramda';
const parseLog = require('./parseLog')({includeLine:false});
const getZip = require('./getZip');

const isInNameDataFormat = d => (
  d[0] && Object.keys(d[0]).length == 2 && 
  d[0].name && d[0].data
);
export const logToData = name => data => 
  isInNameDataFormat(data) ? data : {name,data};
//const tapText = pipe(tap(x=>console.log(x)),prop('text'))

//depending on the ending of the URL, get additional properties for request
// should prop use a regexp here?
const requestPropsByType = {
  'json': req => ({
    transforms: [
      prop('text'),
      JSON.parse,
      logToData(req.url),
    ]
  }),
  'log': req => ({
    transforms:[
      prop('text'),
      parseLog,
      map(omit(['thread','weblogicName','logger'])),
      logToData(req.url),
    ]
  }),
  'zip': req => ({
    responseType: 'blob'
    ,transforms: [
      prop('body'),
      getZip({transform:pipe(
        parseLog,
        logToData(req.url),
      )}),       // returns a promise
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
