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
  }={},data, searchString) => {
    /*console.log("re",{
      searchString,
      data, 
      reStr:reFromSearchString(searchString),
      text: textFn(data),
    });*/
    try{
      const res = filter(
        pipe(
          textFn
          ,test(new RegExp(
            getBuilder(reBuilder)(searchString)
            ,'i'
          ))
        )
        ,data
      );
      return res;
    } catch (err){
      //console.error(err);
      return defaultFn(data);
    }
  }
);

module.exports = filterByString;