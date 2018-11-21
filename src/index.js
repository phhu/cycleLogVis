import xs from 'xstream';
import debounce from 'xstream/extra/debounce';
import sampleCombine from 'xstream/extra/sampleCombine';
//import throttle from 'xstream/extra/throttle';
import {run} from '@cycle/run';
import {makeDOMDriver,h} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeHistoryDriver} from '@cycle/history';
//import {h} from 'snabbdom';    //could prob get rid of JSX
import Snabbdom from 'snabbdom-pragma';    //could prob get rid of JSX
import 'babel-polyfill';    // needed for async 

import {format,addMilliseconds} from 'date-fns'
import {prop,propOr,pipe,map,tap,omit,replace,values,
  unnest,zipWith,zipObj,pluck,trim,split,evolve} from 'ramda';

import {makeEventDropDriver} from './drivers/eventDropDriver';
import {makeDataTablesDriver} from './drivers/dataTablesDriver';
import {addDefaultsToRequest} from './requestMapper';
import {addDefaultsToInputs, getDomInputStreams} from './inputs'
import {combineByGroup, getResponse, toStreamWithAnyPromisesResolved} from './requests'
import {objectToQueryString,queryStringToObject} from './utils/settings';
import {addColors,filterDataRows,filterDatasetsByDate} from './dataFilter';
import {getFilesUnderFolder} from './filesFromFolder';

const parseDuration = require('parse-duration');
const filterByString = require('./utils/regExpFilter')({textFn:prop('name'),reBuilder:'or'});
// for debugging pipes: debug('test')
const debug = label => tap(x=>console.log(label,x));

/*const h2 = (el, attrs, children) => {
  const El = el;
  return (
    <El {...attrs}>{children? children : ''}</El>
  );
}*/

/*
const {runSql,close} = require('./utils/runSql.test');
runSql('select * from bpconfig')
.then(res => console.log(JSON.stringify(res.recordset[0],null,2)))
.then(x=> close());
*/

/*
- improve performance:
  - get rid of dependencies (moment, jsx, superagent (use http driver, which uses it anyway?), babel poyfill / async?)
  - add timeouts / promises (esp for parsers)
  - use transducers in parsers
  - allow filtering by date range (done)
- improve interface
  - allow relative dates (relative to now) : var parse = require('parse-duration')
  - color / filter controls (partially done)
  - request / log file selector control (partially done)
    - easy to make list by parsing the logs folder 
    - could put grouped stuff on same line of input textarea, allowing user to group. 
      - e.g. folder + log file on same line
    - treat folders like regular log? i.e. parse the html, then retrieve the files and 
      return the parsed files combined (in a promise, like a zip - use same code a zip?)
       - just do a name / data pair for each file, allowing the grouping to merge if nec 
        - can match the names as base of url will be same 
        - also date filter could prop work on filenames in some cases (e.g. get date written from filename or server, then discard if before start / after start of another file that is after end)
  - allow to load logs dynamically (i.e include requests in the main loop as stream / control)
- database integration: (not going to work - use server / csv files etc)
  - run query to get timeline (e.g. on SQL profiler output)
  - run SQL derived from logs (including profiler output)
  - could also save arbitrary queries run at certain points in time (to see how values vary over time)
*/
const formatDate = d=> format(d,'YYYY-MM-DDTHH:mm:ss.SSS') ;
const dateFromNow = diffInMs => formatDate(addMilliseconds( new Date(),diffInMs)) ;
const checkForDuration = d => 
   (/^[\+\- ].*/.test(d)) ? dateFromNow(parseDuration(d)) : formatDate(d);

const initialSettings = pipe(
  queryStringToObject
  ,evolve({
    //colorRules: s=>'test',
    startDate: checkForDuration ,
    endDate: checkForDuration,
  })
)(window.location.search);

console.log("initial settings",initialSettings);
const defaultRequest = 'data/timeline.json';
const getRequestsFromInitialSettings = 
  pipe(
    propOr(defaultRequest,'requests')
    ,replace(/^\s*$/,defaultRequest)
    ,trim
    ,split(/\s+/)      // do grouping on new lnes? 
    ,map(addDefaultsToRequest)
  )
;

const ISLOGS = '/logs/Integration%20Server';
const FE = '/software/FusionExchange';

const fileRequests = [
  {url: '/data/timeline.json'},
  //{url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-04-58-02-789.zip`},
  //{url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-12-10-02-613.zip`},
  //{url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-19-28-03-159.zip`},
  `/logs/Integration%20Server/IServer.log`,
  // `http://10.156.206.151:8081/ProductionServer/wfo.log4j.log`,
  //{url: `/logs/Integration%20Server/Plugin_RIExtender102.log`},
  //{url: `${ISLOGS}/Plugin_RIExtender102/2018-09-12/2018-09-12-23-12-01-453.zip`},
  //{url: `${ISLOGS}/IServer/2018-10-24/`},
  //{url: `/software/FusionExchange/BPX-Server.xml`}, // would be good to filter this?    
  //{url: `${FE}/Plugins/Speech/Logs/SpeechSourceMeasureProvider.log`},
  //{url: '/data/Plugin_BatchExtender102.log'},
  //{url: '/data/2018-09-12-23-12-01-453.zip'},
];
const folderRequests = [
 // `http://localhost:8081${ISLOGS}/Plugin_RIExtender/`
];

/*const mergeRequests = async (fileRequests,folderRequests) => {
  let pp;
  const getFiles = folderRequests.map(getFilesUnderFolder);
  try {
    pp = await Promise.all(getFiles);
  } catch (e){
    console.error("error getting folders" ,e);
  }
  return fileRequests.concat(...pp).map(addDefaultsToRequest);
}*/

const requestGroups = [
  {name:'lugin_RIExtender',re: /\/Plugin_RIExtender\//i}
  ,{name:'iserver.log',re: /iserver/i}
  ,{name:'Plugin_RIExtender102.log',re: /Plugin_RIExtender102/i}
];

const inputs = [
  {id:'reload', attrs:{type:'button',value:'Reload',accesskey:"r"}}
  ,{id:'filter', displayName:'filter chart rows' ,updateEvent: 'change',debounce:500, style:{width:"30%"}}
  ,{id:'startDate',displayName:'Start date',debounce:500,attrs: {type:'datetime-local',step:'.001'}}
  ,{id:'endDate',displayName:'End date',debounce:500,attrs: {type:'datetime-local',step:'.001'}}
  //,{id:'startFromNow',debounce:500,attrs: {type:'text'}}
  //,{id:'endFromNow',debounce:500,attrs: {type:'text'}}
  ,{id:'filterByDate',displayName:'Filter by date', attrs:{type:'checkbox'}}
  ,{id:'requests',displayName:'requests',tag:'textarea',spanStyle: {
    "display":"block"
  }, style:{
    "white-space":"pre-wrap",   // sorts out enter key behaviour
    "display":'block',
    width: "600px",
    height: "40px",
  }}
  ,{id:'colorRules',displayName:'Color Rules',tag:'textarea',style:{
    "white-space":"pre-wrap",   // sorts out enter key behaviour
    // "display":'block',
    width: "300px",
    height: "40px",
  }}
 // ,{id:'enableColors', attrs:{type:'checkbox'}}
  ,{id:'filterRules',displayName:'Filter Rules',tag:'textarea',style:{
    "white-space":"pre-wrap",   // sorts out enter key behaviour
    // "display":'block',
    width: "300px",
    height: "40px",
  }}
  //,{id:'enableFilter', attrs:{type:'checkbox'}}
].map(addDefaultsToInputs);

const main = ({initialSettings,requestGroups}) => sources => {
  
  // intent
  const domInputs = getDomInputStreams(sources,initialSettings)(inputs);
  
  // requests  
  const requests = getRequestsFromInitialSettings(initialSettings);
  const httpRequest$ = xs.fromArray(requests);      // need to de-promise these? 
  const responses = requests.map(getResponse(sources));
  
  const chartData$ = xs.combine(...responses)
    .map(unnest)
    .map(combineByGroup(requestGroups))    // better to pass in a function to do combination?
    //.debug("chartData Pre filter")    // better to pass in a function to do combination?
    //
  ; 
  // event drop clicks
  const clickedEventDropData$ = sources.EVENT_DROP
    .startWith([{date:Date(),text:'Click on a blob to view data'}]);

  //view  
  const inputDetails = (specs,values) => zipWith(
    (spec, value) => ({...spec,value}), specs, values
  );
  const domLayout = inputSpecs => inputValues => 
    h(
      'div.controls',{},
      inputDetails(inputSpecs,inputValues)
        .map(({style,id,displayName,value,tag,attrs,spanStyle}) =>
          h('span.control',{spanStyle},[
            //h('label',{},[displayName]), 
            h(tag || 'input',{ 
              style,
              attrs:{
                id,
                placeholder:displayName,
                value,
                checked: ((value === true || value === 'true') && attrs && attrs.type === 'checkbox' ? 'checked' : undefined),
                ...attrs
              }
            },value),
          ])
        )
    )
  ;
  
  const reload$ = domInputs.reload$
  .compose(sampleCombine(...values(domInputs)))
  .map(x=>x.slice(1))  // get rid of initial reload input (duplicate)
  //.debug("reload$")
  .startWith(true);

  //model  
  return {
    HTTP: httpRequest$
    ,DOM: reload$
      .map(domLayout(inputs))
    /*,DOM: xs.combine(...values(domInputs))
      .map(domLayout(inputs))*/
    ,EVENT_DROP: xs.combine(
      chartData$,
      reload$
    ) //.debug('event$')
    .map(([data,[reload,filter,startDate,endDate, filterByDate, requests , colorRules,filterRules]]) =>
        pipe(
          filterByString(filter)   // filter the chart rows 
          ,filterDatasetsByDate({startDate,endDate,filterByDate})   // filter the chart rows 
          ,filterDataRows(filterRules)    //filter the event within rows
          ,addColors(colorRules)
        )(data)
      )    
      //.debug("chartDataFiltered and colored")
    ,DATATABLE: clickedEventDropData$
      .map(pipe(
        map(d=>{
          d.date=format(d.date,'YYYY-MM-DDTHH:mm:ss.SSS');    //Z would be timezone
          return d;
        })
        ,map(omit(['dateRaw','line']))
      ))
    ,history: xs.combine(...values(domInputs))
      .compose(debounce(500))
      .map(zipObj(pluck('id',inputs)))
      .map(omit(['reload']))
      .map(objectToQueryString)
      //.debug("historyOut")
  };
}
   
const drivers = {
  DOM: makeDOMDriver('#app')
  ,HTTP: makeHTTPDriver()
  ,EVENT_DROP: makeEventDropDriver({tag:'#events',...initialSettings})
  ,DATATABLE: makeDataTablesDriver({tableId:'table',tableDivId:'tablediv'})
  ,history: makeHistoryDriver()
};

run(
  main({initialSettings,requestGroups})
  ,drivers
);

/*
mergeRequests(fileRequests,folderRequests)
.then(requests => {
  console.log("requests",requests);
})
*/
