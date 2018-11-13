const {curryN,filter,trim,split,identity,reduce,pipe,test,join,map} = require( 'ramda');
const reEscape = require('escape-string-regexp');

const reBuilders = {
  'and': pipe(
    trim
    ,split(/ +/)
    ,reduce((acc,word)=>`${acc}(?=.*${word})`,"")
  ),
  'or': pipe(
    trim
    ,split(/ +/)
    ,map(reEscape)
    ,join('|')
    ,x=>`(${x})`
  )
}

const getBuilder = builder => 
  (typeof builder === 'function') ? builder : 
    (reBuilders[builder] || reBuilders['and'])
;

const filterByString = curryN(3,
  ({
    textFn=identity
    ,defaultFn=identity
    ,reBuilder='or'
  }={}, searchString, data) => {
    /*console.log("re",{
      searchString,
      data, 
      reStr:getBuilder(reBuilder)(searchString),
      text: textFn(data[0]),
    });*/
    let fitlerer; 
    try{
      filterer = pipe(
        textFn
        ,test(new RegExp(
          getBuilder(reBuilder)(searchString)
          ,'i'
        ))
      )
    } catch (err){
      //console.error(err);
      filterer = defaultFn;
    }
    return filter(filterer,data);
  }
);

module.exports = filterByString;