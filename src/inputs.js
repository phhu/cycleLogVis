// import {inputDefaultMapper, getDomInputStreams} from './inputs'
import xs from 'xstream';
import debounce from 'xstream/extra/debounce';
import sampleCombine from 'xstream/extra/sampleCombine';
import {pipe,map,path,fromPairs} from 'ramda';

export const addDefaultsToInputs = i => ({
  displayName:i.id
  ,debounce:0
  //,type:'text'
  ,updateEvent:
    (i.attrs && i.attrs.type === 'button' )   ? 'click' :
    'input'    
  ,targetPath: 
    (i.attrs && i.attrs.type === 'checkbox' ) ? path(['target','checked']) : 
    (i.attrs && i.attrs.type === 'button' )   ? (e=> true) :    
    path(['target','value'])
  ,...i
});
/*
const eventDropZoomEnd$ = sources.EVENT_DROP
.debug("eventDropZoomEnd$")
.filter(e=>e.type==='ZOOM_END')
.map(e=>e.payload)
.startWith({startDate: initialSettings.startDate, endDate: initialSettings.endDate})
;
const updateDates$ = domInputs.datesFromChart$
.debug("datesFromChart")
.compose(sampleCombine(eventDropZoomEnd$))
.map(x=>x.slice(1)) 
.startWith({startDate: initialSettings.startDate, endDate: initialSettings.endDate})
;
//*/

export const getDomInputStreams = (sources,initialSettings) => inputs => {
  
  const ret = pipe(
    map (input => 
      [
        input.id + '$',
        sources.DOM
          .select('#' + input.id)
          .events(input.updateEvent)
          //.compose(debounce(input.debounce))
          .map(input.targetPath)
          //.debug("input: " + input.id)
          .startWith(initialSettings[input.id] || ''),
      ]
    )
    ,fromPairs    //return an object of streams
  )(inputs);
  
  const updateDates$ = ret.datesFromChart$
    .compose(sampleCombine(
      sources.EVENT_DROP
        .filter(e=>e.type==='ZOOM_END')
        .compose(debounce(50))
        .map(e=>e.payload)
    ))
    .map(x=>x[1]) 
  ;
  ret.startDate$ = xs.merge(ret.startDate$,updateDates$.map(o=>o.startDate.replace(/Z$/,''))).debug("merged start date");
  ret.endDate$ = xs.merge(ret.endDate$,updateDates$.map(o=>o.endDate.replace(/Z$/,''))).debug("merged end date");

  return ret;
};