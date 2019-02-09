// this fills a request object with properties, generally based on url

import {pipe,omit,prop,map,find,is,tap} from 'ramda';
import { init } from 'snabbdom';

// this could probably be generalised a bit... e.g. read folder and import as parsers object 
const parsers = {
  log : require('./parsers/parseLog')({includeLine:false}),
  speechLog: require('./parsers/parseSpeechLog')({includeLine:false}),
  ltf: require('./parsers/parseLtf')({includeLine:false}),
  basic: require('./parsers/parseBasic')({includeLine:true}),
  csv: require('./parsers/parseCsv')({}),
  javaConsoleLogXml: require('./parsers/parseJavaConsoleLogXml')({}),
  bpxServerXmlToTimeline: require('./parsers/parseBPXserverXML').bpxServerXmlToTimeline(),
};

const {parseSqlFromMessage} = require('./parsers/parseSqlFromMessage');

const {getZip} = require('./utils/getZip');
const isInNameDataFormat = d => (
  d[0] && Object.keys(d[0]).length == 2 && 
  d[0].name && d[0].data
);
const makeSureIsPromise = x=>Promise.resolve(x);
export const logToData = name => data => 
  makeSureIsPromise(data)      // incoming data might be a promise or not: so enforce promise to be sure
    .then(data => isInNameDataFormat(data) ? data : {name,data});
//const tapText = pipe(tap(x=>console.log(x)),prop('text'))

export const parser = (req) => {
  console.log("parserReq",req);      //might be best to determine parser dynamically - or make it possible to do this - when have data and response details (mine type etc)
  const r = requestPropsByType.find(rs=>stringMatchesRegExp(rs.re,req.url));
  const ret = (r && r.parser) ? r.parser : parsers.basic; 
  console.log("ret",ret);
  return ret; 
} 
//depending on the ending of the URL, get additional properties for request
// should prop use a regexp here?
export const jsonTransforms = req => [
  prop('text'),
  JSON.parse,
  logToData(req.url),
];

const requestPropsByType = [
  {
    re:'^.*tier3\\.glalab\\.local\\/es\\/.*$',
    parser: JSON.parse ,
    props: req => ({
      transforms: [
        prop('text'),
        JSON.parse,
        //tap(x=>console.log("jsonData",x)),
        d=>d.hits.hits.map(h=>h._source),
        logToData(req.url),
      ]
    })
  },
  {
    re:'plugin\\d+\\.log$',
    parser: parsers.javaConsoleLogXml ,
    props: req => ({
      transforms: [
        prop('text'),
        parser(req),
        logToData(req.url),
      ]
    })
  },
  {
    re:'\\.json$',
    parser: JSON.parse,
    props: req => ({
      transforms: jsonTransforms(req)
    })
  },
  {
    re:'\\.csv$',
    parser: parsers.csv,
    props: req => ({
      transforms: [
        prop('text'),
        parser(req),
        logToData(req.url),
      ]
    })
  },
  {
    re:'\\.(ltf|tmp)$',
    parser: parsers.ltf,
    props: req => ({
      transforms: [
        prop('text'),
        parser(req),
        logToData(req.url),
      ]
    })
  },
  { 
    re:'SpeechSourceMeasureProvider\\.log$',
    parser: parsers.speechLog,
    props: req => ({
      transforms:[
        prop('text')
        ,parser(req)
        ,logToData(req.url),
      ]
    })
  },
  { 
    re:'\\.log(\\.\d+)?$',
    parser: parsers.log,
    props: req => ({
      transforms:[
        prop('text'),
        parser(req),
        map(omit(['weblogicName','component'])),   // 'logger'   'thread',
        map(parseSqlFromMessage),
        logToData(req.url),
      ]
    })
  },
  {
    re:'\\.zip$',
    //parser: '???',   // probably don't want a parser, as the files don't get parsed (only parse once have actual file, which isn't a zip)
    props: req => ({
      responseType: 'blob'
      ,transforms: [
        prop('body'),
        getZip({transform:pipe(
          //parseLog,     // need to detect which parser to run.... to this inside zip module
          logToData(req.url),
        )}),       // returns a promise
      ] 
    })
  },
  {
    re: '\\.xml$',
    parser: parsers.bpxServerXmlToTimeline,
    props: req => ({
      //responseType: 'blob'
      transforms: [
        //tap(x=>console.log("datahere",x)),
        prop('text'),
        parser(req),
        tap(x=>console.log("dataafterparser",x)),
        // body => ([{
        //   date:'2018-10-24'
        //   ,text:'testFAKE XML'
        //   ,body
        // }]),
        //logToData(req.url),
      ] 
    })
  },
  {
    name: 'folder',
    re: '.*/$',
    props: req => ({
      transforms: [
        prop('text'),
        body => ([{
          date:'2018-10-24'
          ,text:'FOLDER'
          ,matches: body.match(/(?<=title=").*?.zip(?=")/g).join("|")
          ,body
        }]),
        logToData(req.url),
      ] 
    })
  },
  {
    re: '.*',
    props: req => ({
      //responseType: 'blob'
      transforms: [
        prop('text'),
        parsers.basic,
        logToData(req.url),
      ] 
    })
  }
];

const stringMatchesRegExp = (reString, str) => {
  const res = new RegExp(reString,'i').test(str);
  //console.log("testing",reString,str,res);
  return res;
}
const getExtensionFromUrl = url => url.replace(/^.*?\.(.*?)(\.[0-9]+)?$/,"$1");



// parser determination needs to be done dynamically - e.g. const parse ({specifyParser,filename},file) => parsedData
// as may want to parse a different type to what was originally put in, as in folders and zip files.
export const addDefaultsToRequest = initialSettings => req => { 
  console.log("REQ",req);
  req = is(String, req) ? {url:req} : req;   // allow just putting in a url as string instead of object
  const rb = initialSettings.requestBase || '';
  req.url = req.url.replace(/%startDate%/gi,initialSettings.startDate);    // do substitution
  req.url = req.url.replace(/%endDate%/gi,initialSettings.endDate);  
  req.url = req.url.replace(/%s/g,rb);    // do substitution
  return ({
    category: req.url
    ,...(
      find(     // get matching props from req definition
        x=>stringMatchesRegExp(x.re,req.url)   
        ,requestPropsByType
      )
      .props(req)
    )
    ,...req        
  })
};
