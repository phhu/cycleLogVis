// import {inputDefaultMapper, getDomInputStreams} from './inputs'
import debounce from 'xstream/extra/debounce';
import {pipe,map,path,fromPairs} from 'ramda';

export const inputDefaultMapper = i => ({
  displayName:i.name
  ,debounce:25
  ,...i
});
 
export const getDomInputStreams = (sources,initialSettings) => 
 pipe(
    map (input => [
      input.name + '$'
      ,sources.DOM
        .select('#' + input.name)
        .events('keyup')
        .compose(debounce(input.debounce))
        .map(path(['target','value']))
        .startWith(initialSettings[input.name] || '') 
    ])
    ,fromPairs
  );


