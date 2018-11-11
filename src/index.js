import xs from 'xstream';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import Snabbdom from 'snabbdom-pragma';

import {prop,pipe,path,map,tap} from 'ramda';
import {makeEventDropDriver,testData} from './eventDropDriver';
import {makeDataTablesDriver} from './dataTablesDriver';

const parseLog = require('./parseLog')({includeLine:false});
const getZip = require('./getZip');
const getJson = pipe(prop('text'),JSON.parse);
const tapText = pipe(tap(x=>console.log(x)),prop('text'))

const logToData = name => data => ({name,data});
const fakeData = {
  name:"loading...",
  data:[{date:new Date(),text:"loading..."}]
};

const getResponse = sources => ({
  category = 'request'
  ,transform = prop('text')     // generally we want text 
  ,startWith= fakeData
}= {}) => sources.HTTP.select(category).flatten().map(transform).startWith(startWith);

const requests =[
  {category: 'timeline',url: '/data/timelineShort.json',  transform: getJson, startWith: fakeData },
  {category: 'log', url: '/data/Plugin_BatchExtender102.log', transform: pipe(prop('text'),parseLog,logToData('Plugin_BatchExtender102')) },
  {category: 'zip', responseType: 'blob', url: '/data/2018-09-12-23-12-01-453.zip', 
    transform: pipe(
      prop('body'),
      getZip({transform:pipe(
        parseLog,
        logToData('2018-09-12-23-12-01-453')
      )})
    ) 
  },
];

const main = sources => {

  const request$ = xs.fromArray(requests); 
  const responses = map(getResponse(sources))(requests);

  const click$ = sources.DOM.select('input').events('click')
    .map(path(['target','checked']))
    .startWith(true)
  ;
  const dropClick$ = sources.EVENT_DROP.startWith([{text:'Click on a blob to view data'}]);

  const domLayout = ([checked]) => (
    <div>
      <div>
        <input type="checkbox" checked/> Toggle me! xx
        {checked ? 'ON' : 'off'}
      </div>
    </div>
  );

  return {
     HTTP: request$
     ,DOM: xs.combine(click$, ...responses).map(domLayout)
     ,EVENT_DROP: xs.combine(...responses)   //.map(([timeline,log,zip])=>[timeline,log,zip])
     ,DATATABLE: dropClick$ 
  };
}
   
const drivers = {
  DOM: makeDOMDriver('#app')
  ,HTTP: makeHTTPDriver()
  ,EVENT_DROP: makeEventDropDriver({tag:'#events'})
  ,DATATABLE: makeDataTablesDriver({tableId:'table',tableDivId:'tablediv'})
};

run(main, drivers);