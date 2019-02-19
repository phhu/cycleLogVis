// import {combineByGroup, getResponse} from './requests'
//import debounce from 'xstream/extra/debounce';
import xs from 'xstream';
import {pipe,map,concat,partition,prop,test,unnest,assoc,ifElse} from 'ramda';
import {format} from 'date-fns';
import {jsonTransforms} from './requestMapper';

// put multiple requests on one line of chart

//const addSourceNameToData = rowName => map(assoc)

export const combineByGroup = groups => data => 
  concat(...groups.reduce (
    ([processed,source],group) => {
      const [matching, remaining] = partition(
        pipe(prop('name'),test(group.re))
        ,source
      );
      if (matching.length>0){
        processed.push ({
          name:group.name
          ,data: pipe(
            map(row=> pipe(
              prop('data')
              ,map(assoc('sourceFile', row.name))   //addsourcefile
            )(row))
            ,unnest 
          )(matching)
        });
      }
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

export const toStreamWithAnyPromisesResolved = x =>
  xs.fromPromise(Promise.resolve(x));

const forceIntoArray = d=>[].concat(d);

const resIsJson =  res => res.header['content-type'] && /^application\/json/i.test(res.header['content-type'])

export const getResponse = sources => ({
  category = 'someRequestUrl'
  ,transforms = prop('text')     // generally we want text, but might also be blob. Can then pipe in others 
  ,startWith = fakeData
}= {}) => 
  sources.HTTP
    .select(category)
    .flatten()       // stream of streams....     
    //.debug(res=>console.log("getResponse",res))   //.header['content-type']
    .map(ifElse(resIsJson      // if the content type is JSON, use json parser directly, else 
      ,pipe(...jsonTransforms({url:category}))
      ,pipe(...transforms)
    ))
    .debug(res=>console.log("transformed",res))  
    .map(toStreamWithAnyPromisesResolved) 
    .flatten()     
    .map(forceIntoArray) 
    .startWith(startWith(category))
;