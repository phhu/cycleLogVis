// this fills a request object with properties, generally based on url

import {always,pipe,omit,prop,map,find,tap,split} from 'ramda';
const parseLog = require('./parsers/parseLog')({includeLine:false,transforms:[
  row => {
    if (/45731/i.test(row.message)){
      //console.log("found error");
      row.color = 'red'
    }
    return row;
  }
]});
const parseSpeechLog = require('./parsers/parseSpeechLog')({includeLine:false});
const parseLtf = require('./parsers/parseLtf')({includeLine:false});
const parseBasic = require('./parsers/parseBasic')({includeLine:true});
const {bpxServerXmlToTimeline} = require('./parsers/parseBPXserverXML');
const getZip = require('./utils/getZip');

const isInNameDataFormat = d => (
  d[0] && Object.keys(d[0]).length == 2 && 
  d[0].name && d[0].data
);
export const logToData = name => data => 
  isInNameDataFormat(data) ? data : {name,data};
//const tapText = pipe(tap(x=>console.log(x)),prop('text'))

//depending on the ending of the URL, get additional properties for request
// should prop use a regexp here?
const requestPropsByType = [
  {
    re:'\\.json$',
    props: req => ({
      transforms: [
        prop('text'),
        JSON.parse,
        logToData(req.url),
      ]
    })
  },
  {
    re:'\\.ltf$',
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
    props: req => ({
      transforms:[
        prop('text'),
        parseLog,
        map(omit(['thread','weblogicName','logger'])),
        logToData(req.url),
      ]
    })
  },
  {
    re:'\\.zip$',
    props: req => ({
      responseType: 'blob'
      ,transforms: [
        prop('body'),
        getZip({transform:pipe(
          parseLog,
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

export const requestMapper = req => ({
  category: req.url
  //,type: getType(req.url)
  //,...requestPropsByType[getExtensionFromUrl(req.url)](req)
  ,...(find(x=>stringMatchesRegExp(x.re,req.url),requestPropsByType).props(req))
  ,...req
});
