import xs from 'xstream';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import Snabbdom from 'snabbdom-pragma';
import {format} from 'date-fns'

import {filter,prop,pipe,path,map,tap,omit,values} from 'ramda';
import {makeEventDropDriver,testData} from './eventDropDriver';
import {makeDataTablesDriver} from './dataTablesDriver';

import {requestMapper} from './requestMapper';

//request definitions
const requests =[
  {url: '/data/timeline.json'},
 // {url: '/data/iserver.json'},
  {url: '/data/Plugin_BatchExtender102.log'},
  {url: '/data/2018-09-12-23-12-01-453.zip'},
]
.map(requestMapper)
.map(tap(x=>console.log("req",x)))
;

//stuff for sorting requests
const fakeData = {
  name:"loading...",
  data:[{date:new Date(),text:"loading..."}]
};
const getResponse = ({sources,filter}) => ({
  category = 'someRequestUrl'
  ,transforms = prop('text')     // generally we want text, but might also be blob. Can then pipe in others 
  ,startWith= fakeData
}= {}) => sources.HTTP
  .select(category)
  .flatten()
  .map(pipe(...transforms))
  /*.map(d=>[].concat(d))    // force into array
  .map(tap(x=>console.log("x",x)))    // force into array
  .filter(rows => rows.filter(row=>(/.*SC.*./.test(row.name))))*/
  .startWith(startWith);

// could do processing of data out of chart in main.... 
const dataTableInputDataMapper = pipe(
  map(d=>{
    d.date=format(d.date,'YYYY-MM-DD HH:mm:ss.SSS');    //Z would be timezone
    return d;
  })
  ,map(omit(['dateRaw','line']))
); 

function main (sources){
  const domInputs = {
    'checkbox$': sources.DOM
      .select('#checkbox')
      .events('click')
      .map(path(['target','checked']))
      .startWith(true)
    ,'filter$': sources.DOM.
      select('#filter')
      .events('keyup')
      // add throttle
      .map(path(['target','value']))
      .startWith("test")
  };

  const request$ = xs.fromArray(requests); 
  const responses = map(getResponse({sources,filter:'102'}))(requests);

  const dropClick$ = sources.EVENT_DROP.startWith([{text:'Click on a blob to view data'}]);

  const domLayout = ([checked,filter]) => (
    <div>
      <div>
        <input id="checkbox" type="checkbox" checked/> {checked ? 'ON' : 'off'}
        Filter : <input id="filter" type="text" value={filter}/> {filter}
      </div>
    </div>
  );

  return {
     HTTP: request$
     ,DOM: xs.combine(...values(domInputs)).map(domLayout)
     ,EVENT_DROP: xs.combine(...responses)   //.map(([timeline,log,zip])=>[timeline,log,zip])
     ,DATATABLE: dropClick$.map(dataTableInputDataMapper)
  };
}
   
const drivers = {
  DOM: makeDOMDriver('#app')
  ,HTTP: makeHTTPDriver()
  ,EVENT_DROP: makeEventDropDriver({tag:'#events'})
  ,DATATABLE: makeDataTablesDriver({tableId:'table',tableDivId:'tablediv'})
};

run(main, drivers);