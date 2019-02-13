import xs from 'xstream';
import debounce from 'xstream/extra/debounce';
import sampleCombine from 'xstream/extra/sampleCombine';
//import throttle from 'xstream/extra/throttle';
import {run} from '@cycle/run';
import {makeDOMDriver,h} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeHistoryDriver} from '@cycle/history';
//import {h} from 'snabbdom';    //could prob get rid of JSX
//import Snabbdom from 'snabbdom-pragma';    //could prob get rid of JSX
import 'babel-polyfill';    // needed for async 


import {format,addMilliseconds} from 'date-fns'
const moment = require('moment');
import {prop,propOr,pipe,map,tap,omit,replace,values,
  unnest,zipWith,zipObj,pluck,trim,split,evolve,reject} from 'ramda';

import {makeEventDropDriver} from './drivers/eventDropDriver';
import {makeDataTablesDriver} from './drivers/dataTablesDriver';
import {addDefaultsToRequest} from './requestMapper';
import {addDefaultsToInputs, getDomInputStreams} from './inputs'
import {combineByGroup, getResponse, toStreamWithAnyPromisesResolved} from './requests'
import {objectToQueryString,queryStringToObject} from './utils/settings';
import {addColors,filterDataRows,filterDatasetsByDate} from './dataFilter';
import {getFilesUnderFolder} from './filesFromFolder';

const parseDuration = require('parse-duration');
const urlJoin = require('proper-url-join');
const filterByString = require('./utils/regExpFilter');
const {getDate} = require('./utils/dates');
const {parser:standardiseSpec} = require('./utils/standardiseObject');
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
  - allow to fetch date range from chart
    -modify eventdrop driver: use zoom event 
  - allow relative dates (relative to now) : var parse = require('parse-duration') - (partially done)
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
  - run query to get timeline (e.g. on SQL profiler output) (working via server)
  - run SQL derived from logs (including profiler output) (sql extracted, need to automate / facilitate running)
  - could also save arbitrary queries run at certain points in time (to see how values vary over time) 
*/
const formatDate = d=> format(d,'YYYY-MM-DDTHH:mm:ss.SSS') ;
const dateFromNow = diffInMs => formatDate(addMilliseconds( new Date(),diffInMs)) ;
const checkForDuration = d => 
   (/^[\+\- ].*/.test(d)) ? dateFromNow(parseDuration(d)) : formatDate(d);    // + encodes space... for convenience allow space to start a positive duration

const initialSettings = pipe(
  queryStringToObject
  ,evolve({
    //colorRules: s=>'test',
    startDate: getDate ,
    endDate: getDate,   //checkForDuration
  })
)(window.location.search);

console.log("initial settings",initialSettings);
const defaultRequest = 'data/timeline.json';
const getRequestsFromInitialSettings = initialSettings => {
  return pipe(
    propOr(defaultRequest,'requests')
    ,replace(/^\s*$/,defaultRequest)
    ,trim
    ,split(/\s+/)      // do grouping on new lnes? 
    ,map(addDefaultsToRequest(initialSettings))
  )(initialSettings);
};

/*
const ISLOGS = '/logs/Integration%20Server';
const FE = '/software/FusionExchange';

const fileRequests = [
  {url: '/data/timeline.json'},
  //{url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-04-58-02-789.zip`},
  `/logs/Integration%20Server/IServer.log`,
  // `http://10.156.206.151:8081/ProductionServer/wfo.log4j.log`,

];
const folderRequests = [
 // `http://localhost:8081${ISLOGS}/Plugin_RIExtender/`
];
*/
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

// used to combine separate items on same line. 
const requestGroups = [
  //{name:'lugin_RIExtender',re: /\/Plugin_RIExtender\//i}
  //,{name:'iserver.log',re: /iserver/i}
  //,{name:'Plugin_RIExtender102.log',re: /Plugin_RIExtender102/i}
];

const inputs = [
  {id:'reload', attrs:{type:'button',value:'Reload',accesskey:"r"}}
  ,{id:'filter', displayName:'filter chart rows' ,updateEvent: 'change',debounce:500, style:{width:"30%"}}
  ,{id:'startDate',displayName:'Start date',updateEvent: 'change',debounce:1500,attrs: {type:'text',step:'.001'}}  // datetime-local
  ,{id:'endDate',displayName:'End date',updateEvent: 'change', debounce:1500,attrs: {type:'text',step:'.001'}}
  //,{id:'start',displayName:'Start dur',debounce:500}
  //,{id:'end',displayName:'End dur',debounce:500}
  //,{id:'startFromNow',debounce:500,attrs: {type:'text'}}
  //,{id:'endFromNow',debounce:500,attrs: {type:'text'}}
  ,{id:'filterByDate',displayName:'Filter by date', attrs:{type:'checkbox'}}
  //,{id:'relativeDates',displayName:'Use relative dates', attrs:{type:'checkbox'}}
  ,{id:'requests',displayName:'requests',tag:'textarea',spanStyle: {
    "display":"block"
  }, style:{
    "white-space":"pre-wrap",   // sorts out enter key behaviour
    "display":'block',
    width: "99%",
    height: "80px",
  }}
  ,{id:'requestBase',displayName:'Request URL base',mapping: standardiseSpec('substitution'),tag:'textarea',style:{
    "white-space":"pre-wrap",   // sorts out enter key behaviour
    // "display":'block',
    width: "300px",
    height: "40px",
  }}
  ,{id:'colorRules',displayName:'Color Rules',mapping: standardiseSpec('color'),tag:'textarea',style:{
    "white-space":"pre-wrap",   // sorts out enter key behaviour
    // "display":'block',
    width: "300px",
    height: "40px",
  }}
 // ,{id:'enableColors', attrs:{type:'checkbox'}}
  ,{id:'filterRules',displayName:'Filter Rules',mapping: standardiseSpec('filter'),tag:'textarea',style:{
    "white-space":"pre-wrap",   // sorts out enter key behaviour
    // "display":'block',
    width: "300px",
    height: "40px",
  }}
  ,{id:'datesFromChart', attrs:{type:'button',value:'Dates from chart'}}
  ,{id:'relativeDatesFromChart', attrs:{type:'button',value:'Relative dates from chart'}}
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
    .filter(e=>e.type==='DROP_CLICK')
    .map(e=>e.payload)
    .startWith([{date:Date(),text:'Click on a blob to view data'}])
  ;

  // reload only emits when reload is pressed - sends all inputs 
  // could probably have checkbox for dates from chart: update automatically (use debounce!)
  const reload$ = xs.merge(domInputs.reload$)
  .compose(sampleCombine(...values(domInputs)))
  .map(x=>x.slice(1))  // get rid of initial reload input (duplicate)
  .startWith(true)

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
            (attrs && attrs.type ==='checkbox') ? h('label',{},[displayName]) : h('span'), 
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
  


  const inputValuesToObj = zipObj(pluck('id',inputs));
  //model  
  return {
    HTTP: httpRequest$
    //,DOM: reload$
    //  .map(domLayout(inputs))
    ,DOM: xs.combine(...values(domInputs))
      .map(domLayout(inputs))
    ,EVENT_DROP: xs.combine(
      chartData$,
      reload$
    ) //.debug('event$')
    .map(([data,inputValues])=>[data,inputValuesToObj(inputValues)])
    //.debug("eventDropInputs")
    .map(([data,{filter,startDate,endDate,filterByDate,filterRules,colorRules}]) =>
        ({
          data: pipe(
            filterByString({textFn:prop('name'),reBuilder:'or'})(filter)   // filter the chart rows 
            ,filterDatasetsByDate({startDate,endDate,filterByDate})   // filter the chart rows 
            ,filterDataRows(filterRules)    //filter the event within rows
            ,addColors(colorRules)
          )(data)
          ,startDate: getDate(startDate)
          ,endDate: getDate(endDate)
        })  
      )
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
      .map(inputValuesToObj)
      .map(omit(['reload','datesFromChart']))
      .map(reject(x=>x===''||x===false|| x==="false" ))   // matching string false a bad idea
      .debug("historyOut")
      .map(objectToQueryString)
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
