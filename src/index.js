import xs from 'xstream';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import Snabbdom from 'snabbdom-pragma';
const parseLog = require('./parseLog')({includeLine:false});
const JSZip = require("jszip");
import {prop,pipe,path,map,tap,invoker} from 'ramda';

const getJson = pipe(prop('text'),JSON.parse);
const getLog = pipe(prop('text'),parseLog);
const tapText  =pipe(
  tap(x=>console.log(x))
  ,require('decompress-response')
  ,tap(x=>console.log(x))
  ,prop('text')
)

const getResponse = sources => ({
  category = 'request'
  ,transform = prop('text')
  ,starting="loading..."
}= {}) => 
  sources.HTTP
    .select(category)
    .flatten()
    .map(transform)
    .startWith(starting)
;

//  - see https://stuk.github.io/jszip/documentation/api_jszip/file_regex.html
const getZip = ({body}) => 
  JSZip.loadAsync(body)   
    .then(pipe(
      invoker(1,'file')(/.*/)    // can use regexp to get files - here the first one   /// [0].async("string")
      ,map(zip=>zip.async("string"))
      ,map(p=>p.then(parseLog))
      ,x=>Promise.all(x)
    ))   
    .then(files=>console.log("zipped file contents",files))
    .catch(console.error);

const requests =[
  {category: 'timeline',url: '/data/timelineShort.json',  transform: getJson },
  {category: 'log', url: '/data/Plugin_BatchExtender102.log', transform: getLog },
  {category: 'zip', responseType: 'blob', accept: 'Accept: application/octet-stream',url: '/data/2018-09-12-23-12-01-453.zip', transform: getZip },
];


// proof that can unzip a file -- see https://stuk.github.io/jszip/documentation/api_jszip/file_regex.html
// fetch('/data/2018-09-12-23-12-01-453.zip')
// .then(res=>res.blob())
// .then(JSZip.loadAsync)    
// //.then(zip=>zip.file("Plugin_RIExtender102.log.2018-09-12-23-12-01-453").async("string") )
// .then(zip=>zip.file(/.*/)[0].async("string") )   // can use regexp to get files
// .then(pipe(parseLog,text=>console.log("zipped file contents",text)))
// .catch(e=>console.error(e));

function main(sources) {

  const request$ = xs.fromArray(requests);
  const responses = map(getResponse(sources))(requests);
 
  responses.push(
    sources.DOM.select('input').events('click')
      .map(path(['target','checked']))
      .startWith(true)
  );

  const domLayout = ([timeline,log,zip,checked]) => (
    <div>
      <div>
        <input type="checkbox" checked/> Toggle me!
        <p>{checked ? 'ON' : 'off'}</p>
        <p>{timeline[0].name}</p>
        <pre>Log{zip}</pre>
        <pre>Log{JSON.stringify(log,null,2)}</pre>
      </div>
    </div>
  );

  return {
     HTTP: request$
     ,DOM: xs.combine(...responses).map(domLayout)
  };
}

const drivers = {
  DOM: makeDOMDriver('#app')
  ,HTTP: makeHTTPDriver()
};


run(main, drivers);