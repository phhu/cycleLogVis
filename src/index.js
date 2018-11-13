import xs from 'xstream';
import debounce from 'xstream/extra/debounce';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import Snabbdom from 'snabbdom-pragma';

import {format} from 'date-fns'
import {prop,pipe,path,map,tap,omit,values,
  unnest,partition,test,assoc,concat,filter} from 'ramda';

import {makeEventDropDriver,testData} from './eventDropDriver';
import {makeDataTablesDriver} from './dataTablesDriver';
import {requestMapper} from './requestMapper';

const filterByString = require('./regExpFilter')({textFn:prop('name'),reBuilder:'or'});

//request definitions
// need to make a server that returns the files.... 
// just chuck the folder in dist for the moment? 
// logs folder, and software/ fusion exchange
// - how to handle multiple servers? 
// should be poss to specify which files to get in UI
// maybe allow ticking of defaults etc
// need autodetect of parser to use 

// - how to combine files into one row? 
// -  - request the folder, get all files within, recursive, with regexp filter

const ISLOGS = '/logs/Integration%20Server';
const FE = '/software/FusionExchange';
const requests = [
  //{url: '/data/timeline.json'},
  {url: `${ISLOGS}/IServer.log`},
  {url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-04-58-02-789.zip`},
  {url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-12-10-02-613.zip`},
  {url: `${ISLOGS}/IServer/2018-10-21/2018-10-21-19-28-03-159.zip`},
  {url: `${ISLOGS}/Plugin_RIExtender102.log`},
  {url: `${ISLOGS}/Plugin_RIExtender102/2018-09-12/2018-09-12-23-12-01-453.zip`},
  //{url: `${ISLOGS}/IServer/2018-10-24/`},
  {url: `${FE}/BPX-Server.xml`}, // would be good to filter this?    
  //{url: `${FE}/Plugins/Speech/Logs/SpeechSourceMeasureProvider.log`},
  //{url: '/data/Plugin_BatchExtender102.log'},
  //{url: '/data/2018-09-12-23-12-01-453.zip'},
] 
.map(requestMapper)
.map(tap(x=>console.log("req",x)))
;

const requestGroups = [
  {name:'iserver.log',re: /iserver/i}
  ,{name:'Plugin_RIExtender102.log',re: /Plugin_RIExtender102/i}
];
const combineByGroup = groups => data => 
  concat(...groups.reduce (
    ([processed,source],group) => {
      const [matching, remaining] = partition(
        pipe(prop('name'),test(group.re))
        ,source
      );
      processed.push ({
        name:group.name
        ,data: pipe(
          map(r=> pipe(
            prop('data')
            ,map(assoc('sourceFile', prop('name')(r)))
          )(r))
          ,unnest 
        )(matching)
      });
      return [processed,remaining];           
    }
    ,[[],data]
  ));

//stuff for sorting requests
const fakeData = category => ({
  name:"loading: "+ category,
  data:[{
    date:format(Date(),'YYYY-MM-DD HH:mm:ss.SSS')
    ,text:"loading: "+ category
  }]
});
const toStreamWithAnyPromisesResolved = x =>
  xs.fromPromise(Promise.resolve(x));
const forceIntoArray = d=>[].concat(d);
const getResponse = sources => ({
  category = 'someRequestUrl'
  ,transforms = prop('text')     // generally we want text, but might also be blob. Can then pipe in others 
  ,startWith = fakeData
}= {}) => 
  sources.HTTP
    .select(category)
    .flatten()       // stream of streams....     
    .map(pipe(...transforms))   // run transforms to get the data as json
    .map(toStreamWithAnyPromisesResolved) 
    .flatten()     
    .map(forceIntoArray) 
    .startWith(startWith(category))
;

// processing of data before it goes to table
const dataTableInputDataMapper = pipe(
  map(d=>{
    d.date=format(d.date,'YYYY-MM-DDTHH:mm:ss.SSS');    //Z would be timezone
    return d;
  })
  ,map(omit(['dateRaw','line']))
); 

const stringMatchesRegExp = (reString, str) => {
  try {
    return new RegExp(reString,'i').test(str);
  } catch(e){
    console.error(
      "error with stringMatchesRegExp: filter regexp probably invalid: "
      ,reString
    );
  }
  return true; // pass everything
};

function main (sources){

  //intent
  const domInputs = {
    'checkbox$': sources.DOM
      .select('#checkbox')
      .events('click')
      .map(path(['target','checked']))
      .startWith(true)
    ,'filter$': sources.DOM.
      select('#filter')
      .events('keyup')
      .compose(debounce(250))
      .map(path(['target','value']))
      .startWith("")
    };

  const httpRequest$ = xs.fromArray(requests); 
  const httpResponses = requests.map(getResponse(sources));
  const httpResponsesFlat$ = xs.combine(...httpResponses)
    .map(unnest)
    .map(combineByGroup(requestGroups))
  ; 

  const eventDropClick$ = sources.EVENT_DROP
  .startWith([{date:Date(),text:'Click on a blob to view data'}]);

  //view  
  const domLayout = ([checked,filterText]) => (
    <div>
      <div>
        {/*
        <input id="checkbox" type="checkbox" checked/> {checked ? 'ON' : 'off'}
        */}
        <br /><input placeholder="filter chart (regexp)" id="filter" type="text" value={filterText} style="width:100%"/>
      </div>
    </div>
  );
  

  //model 
  return {
    HTTP: httpRequest$
    ,DOM: xs.combine(...values(domInputs)).map(domLayout)
    ,EVENT_DROP: xs.combine(domInputs.filter$,httpResponsesFlat$)
      .map(tap(x=>console.log("eventDrops",x)))
      .map(args => filterByString(...args) )
      //could also do a filter by value here
    ,DATATABLE: eventDropClick$.map(dataTableInputDataMapper)
  };
}
   
const drivers = {
  DOM: makeDOMDriver('#app')
  ,HTTP: makeHTTPDriver()
  ,EVENT_DROP: makeEventDropDriver({tag:'#events'})
  ,DATATABLE: makeDataTablesDriver({tableId:'table',tableDivId:'tablediv'})
};

run(main, drivers);