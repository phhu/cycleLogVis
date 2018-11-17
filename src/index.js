import xs from 'xstream';
import debounce from 'xstream/extra/debounce';
//import throttle from 'xstream/extra/throttle';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeHistoryDriver} from '@cycle/history';
import Snabbdom from 'snabbdom-pragma';

import {format} from 'date-fns'
import {prop,pipe,map,tap,omit,values,unnest,zipWith,zipObj,pluck} from 'ramda';

import {makeEventDropDriver} from './drivers/eventDropDriver';
import {makeDataTablesDriver} from './drivers/dataTablesDriver';
import {requestMapper} from './requestMapper';
import {addDefaultsToInputs, getDomInputStreams} from './inputs'
import {combineByGroup, getResponse, toStreamWithAnyPromisesResolved} from './requests'
import {objectToQueryString,queryStringToObject} from './utils/settings';
import {addColors,filterDataRows} from './dataFilter';
import {getFilesUnderFolder} from './filesFromFolder';

const filterByString = require('./utils/regExpFilter')({textFn:prop('name'),reBuilder:'or'});
// for debugging pipes: debug('test')
const debug = label => tap(x=>console.log(label,x));

/*
- automate directory parsing to get logs
  - extract directory structure from base path, for HTTP or file system
- highlighting / hiding / deletion of (un)interesting entries
  - could do mapping on chart data stream - i.e. calculate colors at point of chart refresh. (without reloading data). Prob just a mapping on the chart data stream.
- make json colouring rules: e.g. {set: '.*', color:red, priority: 1, field: 'message', test: 'faiulre / reTest:'failure' reflag:'i'}
  - or might be possible to apply css to SVG elements, then to change css definition (e.g. put drops into classes, then change class def)

*/
const initialSettings = queryStringToObject(window.location.search);

const ISLOGS = '/logs/Integration%20Server';
const FE = '/software/FusionExchange';

const fileRequests = [
  //{url: '/data/timeline.json'},
  //{url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-04-58-02-789.zip`},
  //{url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-12-10-02-613.zip`},
  //{url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-19-28-03-159.zip`},
  `${ISLOGS}/IServer.log`,
  // `http://10.156.206.151:8081/ProductionServer/wfo.log4j.log`,
  //{url: `${ISLOGS}/Plugin_RIExtender102.log`},
  //{url: `${ISLOGS}/Plugin_RIExtender102/2018-09-12/2018-09-12-23-12-01-453.zip`},
  //{url: `${ISLOGS}/IServer/2018-10-24/`},
  //{url: `${FE}/BPX-Server.xml`}, // would be good to filter this?    
  //{url: `${FE}/Plugins/Speech/Logs/SpeechSourceMeasureProvider.log`},
  //{url: '/data/Plugin_BatchExtender102.log'},
  //{url: '/data/2018-09-12-23-12-01-453.zip'},
];
const folderRequests = [
  `${ISLOGS}/Plugin_BatchExtender7/`
];
const mergeRequests = async (fileRequests,folderRequests) => {
  const fromFolder = await folderRequests.map(getFilesUnderFolder);
  return fileRequests.concat(...fromFolder);
}
const requests = mergeRequests(fileRequests,folderRequests).map(requestMapper);

const requestGroups = [
  {name:'iserver.log',re: /iserver/i}
  ,{name:'Plugin_RIExtender102.log',re: /Plugin_RIExtender102/i}
];

const main = ({initialSettings,requests,requestGroups}) => sources => {
  
  // intent
  const inputs = [
    {name:'filter',displayName:'filter chart',debounce:500, style:"width:30%"}
    ,{name:'startDate',type:'date'}
    ,{name:'endDate',type:'date'}
  ].map(addDefaultsToInputs);
  const domInputs = getDomInputStreams(sources,initialSettings)(inputs);
  
  // requests  
  const httpRequest$ = xs.fromArray(requests);      // need to de-promise these! 
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
  const domLayout = (inputSpecs) => (inputValues) => {
    const inputDetails = zipWith(
      (o, value) => ({value,...o}), inputSpecs, inputValues
    );
    const inputHtml = inputDetails.map(i=>(
      <input 
        placeholder={i.displayName} 
        id={i.name} 
        type={i.type || text}
        value={i.value} 
        style={i.style}
      />
    ));
    return (
      <div>
        <div>
          {inputHtml}
        </div>
      </div>
    )
  };

  //model 
  return {
    HTTP: httpRequest$
    ,DOM: xs.combine(...values(domInputs))
      .map(domLayout(inputs))
    ,EVENT_DROP: xs.combine(domInputs.filter$,chartData$)
      .map(([filter,data]) => filterByString(filter,data) )    // filter the rows
      .map(filterDataRows )
      .map(addColors)
      //.debug("chartDataFiltered and colored")
      //could also do a filter by value here
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
      .map(zipObj(pluck('name',inputs)))
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
  main({initialSettings,requests,requestGroups})
  ,drivers
);