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

export const getResponse = sources => ({
  category = 'someRequestUrl'
  ,transforms = prop('text')     // generally we want text, but might also be blob. Can then pipe in others 
  ,startWith = fakeData
}= {}) => 
  sources.HTTP
    .select(category)
    .flatten()       // stream of streams....     
    //.debug(res=>console.log("getResponse",res))   //.header['content-type']
    .map(ifElse(      // this could prop be a converge...
      res => res.header['content-type'] && /^application\/json/i.test(res.header['content-type'])
      ,pipe(...jsonTransforms({url:category}))
      ,pipe(...transforms)
    ))   // run transforms to get the data as json    - if it's already json, don't need to bother
    .map(toStreamWithAnyPromisesResolved) 
    .flatten()     
    .map(forceIntoArray) 
    .startWith(startWith(category))
;