// import {inputDefaultMapper, getDomInputStreams} from './inputs'
import debounce from 'xstream/extra/debounce';
import {pipe,map,path,fromPairs} from 'ramda';

export const addDefaultsToInputs = i => ({
  displayName:i.name
  ,debounce:25
  ,type:'text'
  ,...i
});
 
export const getDomInputStreams = (sources,initialSettings) => 
 pipe(
    map (input => [
      input.id + '$'
      ,sources.DOM
        .select('#' + input.id)
        .events(input.updateEvent || 'change')
        .compose(debounce(input.debounce))
        .map(path(['target','value']))
        .startWith(initialSettings[input.id] || '') 
    ])
    ,fromPairs
  );


