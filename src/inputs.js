// import {inputDefaultMapper, getDomInputStreams} from './inputs'
import debounce from 'xstream/extra/debounce';
import {pipe,map,path,fromPairs} from 'ramda';

export const addDefaultsToInputs = i => ({
  displayName:i.name
  ,debounce:25
  ,type:'text'
  ,updateEvent: 'change'
  ,targetPath: ['target','value']
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
          .compose(debounce(input.debounce))
          .map(path(input.targetPath))
          .startWith(initialSettings[input.id] || ''),
      ]
    )
    ,fromPairs
  )
;