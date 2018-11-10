import xs from 'xstream';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import Snabbdom from 'snabbdom-pragma';

const parseLog = require('./parseLog')({includeLine:false});

import {prop,pipe,path,map,tap,invoker,identity} from 'ramda';
import {makeEventDropDriver} from './eventDropDriver';

const getZip = require('./getZip');
const getJson = pipe(prop('text'),JSON.parse);
const getLog = pipe(prop('text'),parseLog);
const tapText  =pipe(
  tap(x=>console.log(x))
  ,prop('text')
)

const getResponse = sources => ({
  category = 'request'
  ,transform = prop('text')
  ,startWith="loading..."
}= {}) => 
  sources.HTTP
    .select(category)
    .flatten()
    .map(transform)
    .startWith(startWith)
;



const requests =[
  {category: 'timeline',url: '/data/timelineShort.json',  transform: getJson, startWith:[{name:"loading",data:[]}] },  // 
  {category: 'log', url: '/data/Plugin_BatchExtender102.log', transform: getLog },
  {category: 'zip', responseType: 'blob', url: '/data/2018-09-12-23-12-01-453.zip', transform: getZip({transform:parseLog}) },
];

// proof that can unzip a file -- see https://stuk.github.io/jszip/documentation/api_jszip/file_regex.html
// fetch('/data/2018-09-12-23-12-01-453.zip')
// .then(res=>res.blob())
// .then(JSZip.loadAsync)    
// //.then(zip=>zip.file("Plugin_RIExtender102.log.2018-09-12-23-12-01-453").async("string") )
// .then(zip=>zip.file(/.*/)[0].async("string") )   // can use regexp to get files
// .then(pipe(parseLog,text=>console.log("zipped file contents",text)))
// .catch(e=>console.error(e));

const  main = (sources) => {

  const request$ = xs.fromArray(requests);
  const responses = map(getResponse(sources))(requests);

  const click$ = sources.DOM.select('input').events('click')
    .map(path(['target','checked']))
    .startWith(true)
  ;

  //let chartDrawn = false;
  const domLayout = ([checked,timeline]) => {
    return (<div>
      <div>
        <input type="checkbox" checked/> Toggle me! xx
        <p>{checked ? 'ON' : 'off'}</p>
        <p>{timeline[0].name}</p>
        {/*<pre>Log{zip}</pre> 
        <pre>Log{JSON.stringify(log,null,2)}</pre> */}
      </div>
    </div>);
  }; 

  return {
     HTTP: request$
     ,DOM: xs.combine(click$, ...responses).map(domLayout)
     ,EVENT_DROP: xs.combine(...responses).map(([timeline,log,zip])=>timeline)
  };
}

// should probably make a separate chart driver.... output only for moment.
const drivers = {
  DOM: makeDOMDriver('#app')
  ,HTTP: makeHTTPDriver()
  ,EVENT_DROP: makeEventDropDriver({tag:'#events'})
};

run(main, drivers);