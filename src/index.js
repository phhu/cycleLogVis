import xs from 'xstream';
import debounce from 'xstream/extra/debounce';
//import throttle from 'xstream/extra/throttle';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeHistoryDriver} from '@cycle/history';
import Snabbdom from 'snabbdom-pragma';

import {format} from 'date-fns'
import {prop,pipe,map,tap,omit,values,unnest,zipWith,zipObj} from 'ramda';

import {makeEventDropDriver} from './drivers/eventDropDriver';
import {makeDataTablesDriver} from './drivers/dataTablesDriver';
import {requestMapper} from './requestMapper';
import {inputDefaultMapper, getDomInputStreams} from './inputs'
import {combineByGroup, getResponse} from './requests'
import {makeQueryString,getInitialSettings} from './utils/settings';

const filterByString = require('./utils/regExpFilter')({textFn:prop('name'),reBuilder:'or'});
// for debugging pipes: debug('test')
const debug = label => tap(x=>console.log(label,x));

const initialSettings = getInitialSettings(window.location.search);

const ISLOGS = '/logs/Integration%20Server';
const FE = '/software/FusionExchange';
const requests = [
  //{url: '/data/timeline.json'},
  //{url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-04-58-02-789.zip`},
  //{url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-12-10-02-613.zip`},
  //{url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-19-28-03-159.zip`},
  //{url: `${ISLOGS}/IServer.log`},
  {url: `${ISLOGS}/Plugin_RIExtender102.log`},
  //{url: `${ISLOGS}/Plugin_RIExtender102/2018-09-12/2018-09-12-23-12-01-453.zip`},
  //{url: `${ISLOGS}/IServer/2018-10-24/`},
  {url: `${FE}/BPX-Server.xml`}, // would be good to filter this?    
  {url: `${FE}/Plugins/Speech/Logs/SpeechSourceMeasureProvider.log`},
  //{url: '/data/Plugin_BatchExtender102.log'},
  //{url: '/data/2018-09-12-23-12-01-453.zip'},
].map(requestMapper);

const requestGroups = [
  {name:'iserver.log',re: /iserver/i}
  ,{name:'Plugin_RIExtender102.log',re: /Plugin_RIExtender102/i}
];

const main = ({initialSettings,requests,requestGroups}) => sources => {
  
  // intent
  const inputs = [
    {name:'filter',displayName:'filter chart',debounce:500, style:"width:30%"}
    ,{name:'startDate'}
    ,{name:'endDate'}
  ].map(inputDefaultMapper);

  const domInputs = getDomInputStreams(sources,initialSettings)(inputs);
  
  // requests  
  const httpRequest$ = xs.fromArray(requests); 
  const chartData$ = 
    xs.combine(...requests.map(getResponse(sources)))
    .map(unnest)
    .map(combineByGroup(requestGroups))    // better to pass in a function to do combination?
  ; 
  // event drop clicks
  const clickedEventDropData$ = sources.EVENT_DROP
    .startWith([{date:Date(),text:'Click on a blob to view data'}]);

  //view  
  const domLayout = (inputSpecArray) => (inputValueArray) => {
    const inputHtml = zipWith((spec, value) => ({value,...spec}),inputSpecArray,inputValueArray)
      .map(i=>(<input placeholder={i.displayName} id={i.name} type="text" value={i.value} style={i.style}></input>))
    ;
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
      .map(([filter,data]) => filterByString(filter,data) )
      .debug("chartDataFiltered")
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
    .map(inputValues => zipObj(inputs.map(i=>i.name),inputValues))
    .map(makeQueryString)
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
  , drivers
);