import xs from 'xstream';
import debounce from 'xstream/extra/debounce';
//import throttle from 'xstream/extra/throttle';
import {run} from '@cycle/run';
import {makeDOMDriver, h,div} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeHistoryDriver} from '@cycle/history';
//import Snabbdom from 'snabbdom-pragma';    //could prob get rid of JSX
import 'babel-polyfill';    // needed for async 

import {format} from 'date-fns'
import {prop,propOr,pipe,map,tap,omit,replace,values,
  unnest,zipWith,zipObj,pluck,trim,split} from 'ramda';

import {makeEventDropDriver} from './drivers/eventDropDriver';
import {makeDataTablesDriver} from './drivers/dataTablesDriver';
import {addDefaultsToRequest} from './requestMapper';
import {addDefaultsToInputs, getDomInputStreams} from './inputs'
import {combineByGroup, getResponse, toStreamWithAnyPromisesResolved} from './requests'
import {objectToQueryString,queryStringToObject} from './utils/settings';
import {addColors,filterDataRows} from './dataFilter';
import {getFilesUnderFolder} from './filesFromFolder';

const filterByString = require('./utils/regExpFilter')({textFn:prop('name'),reBuilder:'or'});
// for debugging pipes: debug('test')
const debug = label => tap(x=>console.log(label,x));

/*
const {runSql,close} = require('./utils/runSql.test');
runSql('select * from bpconfig')
.then(res => console.log(JSON.stringify(res.recordset[0],null,2)))
.then(x=> close());
*/

/*
- improve performance:
  - get rid of dependencies (moment, jsx, superagent (should be http driver?), babel poyfill / async?)
  - add timeouts / promises (esp for parsers)
  - use transducers in parsers
  - allow filtering by date range
- improve interface
  - color / filter controls
  - request / log file selector control
    - easy to make list by parsing the logs folder 
    - could put grouped stuff on same line of input textarea, allowing user to group. 
      - e.g. folder + log file on same line
    - treat folders like regular log? i.e. parse the html, then retrieve the files and 
      return the parsed files combined (in a promise, like a zip - use same code a zip?)
       - just do a name / data pair for each file, allowing the grouping to merge if nec 
        - can match the names as base of url will be same 
  - allow to load logs dynamically (i.e include requests in the main loop as stream / control)
- database integration: 
  - run query to get timeline (e.g. on SQL profiler output)
  - run SQL derived from logs (including profiler output)
  - could also save arbitrary queries run at certain points in time (to see how values vary over time)
*/

const initialSettings = queryStringToObject(window.location.search);
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

const mergeRequests = async (fileRequests,folderRequests) => {
  let pp;
  const getFiles = folderRequests.map(getFilesUnderFolder);
  try {
    pp = await Promise.all(getFiles);
  } catch (e){
    console.error("error getting folders" ,e);
  }
  return fileRequests.concat(...pp).map(addDefaultsToRequest);
}

const requestGroups = [
  {name:'lugin_RIExtender',re: /\/Plugin_RIExtender\//i}
  ,{name:'iserver.log',re: /iserver/i}
  ,{name:'Plugin_RIExtender102.log',re: /Plugin_RIExtender102/i}
];

const inputs = [
  {id:'filter', displayName:'filter chart' ,updateEvent: 'change',debounce:500, style:{width:"30%"}}
  ,{id:'startDate',attrs: {type:'date'}}
  ,{id:'endDate',attrs: {type:'date'}}
  ,{id:'requests',displayName:'requests',tag:'textarea',style:{
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
  ,{id:'filterRules',displayName:'Filter Rules',tag:'textarea',style:{
    "white-space":"pre-wrap",   // sorts out enter key behaviour
   // "display":'block',
    width: "300px",
    height: "40px",
  }}
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
    div(
      '.controls',{},
      inputDetails(inputSpecs,inputValues)
        .map(({style,id,displayName,value,tag,attrs}) =>
          h(tag || 'input',{ 
            style,
            attrs:{
              id,
              placeholder:displayName,
              value,
              ...attrs
            }
          },value)
        )
    )
  ;

  //model  
  return {
    HTTP: httpRequest$
    ,DOM: xs.combine(...values(domInputs))
      .map(domLayout(inputs))
    ,EVENT_DROP: xs.combine(domInputs.filter$,domInputs.colorRules$,domInputs.filterRules$,chartData$)
      .map(([filter,colorRules,filterRules,data]) =>
        pipe(
          filterByString(filter)   // filter the chart rows 
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