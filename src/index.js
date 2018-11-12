import xs from 'xstream';
import debounce from 'xstream/extra/debounce';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import Snabbdom from 'snabbdom-pragma';
import {format} from 'date-fns'

import {filter,prop,pipe,path,map,tap,omit,values,unnest} from 'ramda';
import {makeEventDropDriver,testData} from './eventDropDriver';
import {makeDataTablesDriver} from './dataTablesDriver';

import {requestMapper} from './requestMapper';

//request definitions
const requests = [
  {url: '/data/timeline.json'},
  {url: '/data/iserver.json'},
  {url: '/data/Plugin_BatchExtender102.log'},
  {url: '/data/2018-09-12-23-12-01-453.zip'},
]
.map(requestMapper)
.map(tap(x=>console.log("req",x)))
;

//stuff for sorting requests
const fakeData = category => ({
  name:"loading: "+ category,
  data:[{
    date:format(Date(),'YYYY-MM-DD HH:mm:ss.SSS')
    ,text:"loading: "+ category
  }]
});
const toStreamWithAnyPromisesResolved = x=>xs.fromPromise(Promise.resolve(x));
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

// set and remove fields for table
const dataTableInputDataMapper = pipe(
  map(d=>{
    d.date=format(d.date,'YYYY-MM-DDTHH:mm:ss.SSS');    //Z would be timezone
    return d;
  })
  ,map(omit(['dateRaw','line']))
); 

const reTest = (reString, str) => {
  try {
    return new RegExp(reString,'i').test(str);
  } catch(e){
    console.error("error with reTest: filter regexp probably invalid: ",reString);
  }
  return true;
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
  const httpResponsesFlat$ = xs.combine(...httpResponses).map(unnest); 

  const eventDropClick$ = sources.EVENT_DROP
    .startWith([{date:Date(),text:'Click on a blob to view data'}]);

  //view  
  const domLayout = ([checked,filterText]) => (
    <div>
      <div>
        {/*
        <input id="checkbox" type="checkbox" checked/> {checked ? 'ON' : 'off'}
        */}
        <br />Filter chart: <input id="filter" type="text" value={filterText}/>
      </div>
    </div>
  );
  
  //model 
  return {
    HTTP: httpRequest$
    ,DOM: xs.combine(...values(domInputs)).map(domLayout)
    ,EVENT_DROP: xs.combine(domInputs.filter$,httpResponsesFlat$)
      .map(([filterText,data]) => 
        data.filter(r=>reTest(filterText,r.name))
        //could also do a filter by value here
      ) 
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