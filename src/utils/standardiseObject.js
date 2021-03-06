const {tap,is,pipe,tryCatch} = require( 'ramda');
const parse = require('loose-json');

const objMap = (keyKey,valueKey) => obj => Object.entries(obj)
//.map(x=>{console.log(x);return x})
.map(([key,value])=>({[keyKey]:key,[valueKey]:value}) )

//should use a map here
const templates = {
  color: {
    'String': str => ([{ color:'red',search:str }]),
    'Object': objMap("color","search"),
    'Array': arr => arr,
  },
  filter: {
    'String': str => ([{ search:str }]),
    'Object': objMap("name","search"),
    'Array': arr => arr,
  },
  // '%x': 'value'
  substitution: {
    //'String': str => str,     // 
    'String': str => ({'%x':str }),     // 
    'Object': o=>o, //objMap("search","replacement"),
    'Array': arr => arr,
  },
}

const test = type => (input) => {
  try {
    return is(String,input) ? templates[type].String(input) :
      is(Array,input) ? templates[type].Array(input) :
      is(Object,input) ? templates[type].Object(input) :
      input;
  } catch (e){
    return input;
  }
}

const parser = type => pipe(
  tryCatch(parse,(e,x)=>`${x}`)    // if parse fails, treat as a string
  ,test(type)
  //,tap(x=>console.log("x",x))
  ,x=>JSON.stringify(x)
);

module.exports = {
  parser
}