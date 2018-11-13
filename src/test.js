const {filter,trim,split,identity,toPairs,reduce,compose,prop,pipe,path,map,tap,omit,values,find,
  defaultTo,unnest,partition,test,assoc,concat,always,__,groupBy} = require( 'ramda');
/*
const requestGroups = [
  {name:'iserver.log',re: /iserver/i}
  ,{name:'Plugin_RIExtender102.log',re: /Plugin_RIExtender102/i}
];

const fakeData = [
  {name: 'iserver', data:[1,2,3]},
  {name: 'iserver2', data:[1,2,3]},
  {name: 'test', data:[1,2,3]},
  {name: 'test2', data:[1,2,3]},
  {name: 'Plugin_RIExtender102', data:[1,2,3]},
  {name: 'Plugin_RIExtender102', data:[1,2,3]},

];

const log = tap(x=>console.log("x",x));
// dataset to name of group it should go in

const grouper = groups => pipe(
  prop('name')
  ,name => find(
    pipe(
      prop('re')
      ,test(__,name)
    )
  )(groups)
  ,prop('name')    //of grouping rule
  ,defaultTo('default')
);
  
  const test2 = grouper(requestGroups)(fakeData[2]);
  console.log(test2);


const ns = [1,2,3,4,5];
const r = groupBy(x=>x>1 ? true:undefined,ns);
const {undefined:undef,...rest} = r;
//const r.groupBy
console.log(undef, rest);
const joined = reduce(
  (acc,[name,data])=>{
    acc.push({name,data:data.join('')});
    return acc;
  } 
  ,[]
  ,toPairs(rest)
);

console.log(r);
console.log(joined);
*/


const filterByString = require('./regExpFilter');

const data = ['a bb','b a','c bb'];
const filterer = filterByString({},data);
console.log(
  filterer('a b{2}')
  // filterer('a b{2}')
)
