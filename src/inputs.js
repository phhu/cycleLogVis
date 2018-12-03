// import {inputDefaultMapper, getDomInputStreams} from './inputs'
import xs from 'xstream';
import debounce from 'xstream/extra/debounce';
import sampleCombine from 'xstream/extra/sampleCombine';
import {pipe,map,path,fromPairs,evolve} from 'ramda';
const {durationBetween} = require('./utils/dates');

export const addDefaultsToInputs = i => ({
  displayName:i.id
  ,mapping:x=>x
  ,debounce:0
  //,type:'text'
  ,updateEvent:
    (i.attrs && i.attrs.type === 'button' )   ? 'click' :
    'change'    
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
          .map(input.mapping)
          //.debug("input: " + input.id)
          .startWith(initialSettings[input.id] || ''),
      ]
    )
    ,fromPairs    //return an object of streams
  )(inputs);
  
  const datesFromChartZoom$ = sources.EVENT_DROP
  .filter(e=>e.type==='ZOOM_END')
    .compose(debounce(250))
    .map(e=>e.payload);

  const updateDates$ = xs.merge(
    ret.datesFromChart$.map(e=>1)
    ,ret.relativeDatesFromChart$.map(e=>2)
  )
    .compose(sampleCombine(datesFromChartZoom$))
    .map(x=>(x[0] === 1) ? x[1]: evolve({
      startDate:durationBetween,
      endDate:durationBetween
    },x[1]))
    //.startWith({startDate:initialSettings.startDate,endDate:initialSettings.endDate})
  ;
  ret.startDate$ = xs.merge(ret.startDate$,updateDates$.map(o=>o.startDate)).startWith(initialSettings.startDate || '').debug("merged start date");
  ret.endDate$ = xs.merge(ret.endDate$,updateDates$.map(o=>o.endDate)).startWith(initialSettings.endDate || '').debug("merged end date");

  return ret;
};