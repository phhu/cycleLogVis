// this fills a request object with properties, generally based on url

import {pipe,omit,prop,map,find,is} from 'ramda';

// this could probably be generalised a bit... e.g. read folder and import as parsers object 
const parseLog = require('./parsers/parseLog')({includeLine:false});
const parseSpeechLog = require('./parsers/parseSpeechLog')({includeLine:false});
const parseLtf = require('./parsers/parseLtf')({includeLine:false});
const parseBasic = require('./parsers/parseBasic')({includeLine:true});
const parseCsv = require('./parsers/parseCsv')({});
const {bpxServerXmlToTimeline} = require('./parsers/parseBPXserverXML');

const getZip = require('./utils/getZip');
const isInNameDataFormat = d => (
  d[0] && Object.keys(d[0]).length == 2 && 
  d[0].name && d[0].data
);
const makeSureIsPromise = x=>Promise.resolve(x);
export const logToData = name => data => 
  makeSureIsPromise(data)      // incoming data might be a promise or not: so enforce promise to be sure
    .then(data => isInNameDataFormat(data) ? data : {name,data});
//const tapText = pipe(tap(x=>console.log(x)),prop('text'))

const parser = ({filename}) => {
  const r = requestPropsByType.find(rs=>stringMatchesRegExp(rs.re,filename));
  return  (r && r.parser) ? r.parser : parseBasic; 
} 
//depending on the ending of the URL, get additional properties for request
// should prop use a regexp here?
const requestPropsByType = [
  {
    re:'\\.json$',
    parser: JSON.parse,
    props: req => ({
      transforms: [
        prop('text'),
        JSON.parse,
        logToData(req.url),
      ]
    })
  },
  {
    re:'\\.csv$',
    parser: parseCsv,
    props: req => ({
      transforms: [
        prop('text'),
        parseCsv,
        logToData(req.url),
      ]
    })
  },
  {
    re:'\\.ltf$',
    parser: parseLtf,
    props: req => ({
      transforms: [
        prop('text'),
        parseLtf,
        logToData(req.url),
      ]
    })
  },
  { 
    re:'SpeechSourceMeasureProvider\\.log$',
    parser: parseSpeechLog,
    props: req => ({
      transforms:[
        prop('text')
        ,parseSpeechLog
        ,logToData(req.url),
      ]
    })
  },
  { 
    re:'\\.log(\\.\d+)?$',
    parser: parseLog,
    props: req => ({
      transforms:[
        prop('text'),
        parseLog,
        map(omit(['weblogicName','component'])),   // 'logger'   'thread',
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
          parseLog,     // need to detect which parser to run.... recurse through this?
          logToData(req.url),
        )}),       // returns a promise
      ] 
    })
  },
  {
    re: '\\.xml$',
    props: req => ({
      //responseType: 'blob'
      transforms: [
        prop('text'),
        bpxServerXmlToTimeline({}),
        // body => ([{
        //   date:'2018-10-24'
        //   ,text:'testFAKE XML'
        //   ,body
        // }]),
        // logToData(req.url),
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
        parseBasic,
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
export const addDefaultsToRequest = req => { 
  req = is(String, req) ? {url:req} : req;   // allow just putting in a url as string instead of object
  return ({
    url: req.url         
    ,category: req.url
    //,type: getType(req.url)
    //,...requestPropsByType[getExtensionFromUrl(req.url)](req)
    ,...(
      find(     // get matching props from req definition
        x=>stringMatchesRegExp(x.re,req.url)   
        ,requestPropsByType)
      .props(req)
    )
    ,...req
  })
};
