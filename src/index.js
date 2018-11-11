import xs from 'xstream';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import Snabbdom from 'snabbdom-pragma';

import {prop,pipe,path,map,tap,invoker,identity} from 'ramda';
import {makeEventDropDriver,testData} from './eventDropDriver';
import {makeDataTablesDriver} from './dataTablesDriver';

const parseLog = require('./parseLog')({includeLine:false});
const getZip = require('./getZip');
const getJson = pipe(prop('text'),JSON.parse);
const tapText = pipe(tap(x=>console.log(x)),prop('text'))

const fakeData = [{
  name:"loading...",
  data:[{date:new Date,text:"loading..."}]
}];
const getResponse = sources => ({
  category = 'request'
  ,transform = prop('text')
  ,startWith= fakeData
}= {}) => sources.HTTP.select(category).flatten().map(transform).startWith(startWith);

const logToData = name => data => ([{name,data}]);

const requests =[
  {category: 'timeline',url: '/data/timelineShort.json',  transform: getJson, startWith: fakeData },
  {category: 'log', url: '/data/Plugin_BatchExtender102.log', transform: pipe(prop('text'),parseLog,logToData('Plugin_BatchExtender102')) },
  {category: 'zip', responseType: 'blob', url: '/data/2018-09-12-23-12-01-453.zip', transform: getZip({transform:parseLog}) },
];

const main = (sources) => {

  const request$ = xs.fromArray(requests); 
  const responses = map(getResponse(sources))(requests);

  const click$ = sources.DOM.select('input').events('click')
    .map(path(['target','checked']))
    .startWith(true)
  ;
  const dropClick$ = sources.EVENT_DROP.startWith(testData[0].data);

  const domLayout = ([checked,timeline]) => {
    return (<div>
      <div>
        <input type="checkbox" checked/> Toggle me! xx
        <p>{checked ? 'ON' : 'off'}</p>
        {/*<p>{timeline[0].name}</p>
        <pre>Log{zip}</pre> 
        <pre>Log{JSON.stringify(log,null,2)}</pre> */}
      </div>
    </div>);
  }; 

  return {
     HTTP: request$
     ,DOM: xs.combine(click$, ...responses).map(domLayout)
     ,EVENT_DROP: xs.combine(...responses).map(([timeline,log,zip])=>log)
     ,DATATABLE: dropClick$ 
  };
}
   
const drivers = {
  DOM: makeDOMDriver('#app')
  ,HTTP: makeHTTPDriver()
  ,EVENT_DROP: makeEventDropDriver({tag:'#events'})
  ,DATATABLE: makeDataTablesDriver({tag:'#table'})
};

run(main, drivers);