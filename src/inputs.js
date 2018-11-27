// import {inputDefaultMapper, getDomInputStreams} from './inputs'
import debounce from 'xstream/extra/debounce';
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
 
export const getDomInputStreams = (sources,initialSettings) => 
 pipe(
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
    ,fromPairs
  )
;