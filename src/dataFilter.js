const addDefaultsToRules = r => ({
  nameRe:new RegExp(r.name || '.*', 'i')
  ,searchRe: new RegExp(r.search,'i')
  ,priority: 1
  ,name: '.*'
  ,...r
});

const colorRules = [
  {name:'.*',  field:'message', search:'(error|failure)', color:'red', priority: 10}, 
  {name:'.*102.*',  field:'message', search:'(success)', color:'green', priority: 2} ,
].map(addDefaultsToRules);

const filterRules = [
  {name:'speech',  field:'message', search:'(error|failure)'}, 
  {name:'102',  field:'message', search:'(success)'} ,
].map(addDefaultsToRules);

const getRulesForDataset = rules => dataset => 
  rules
    .filter(r=>r.nameRe.test(dataset.name))
    .sort((a,b)=>(a.priority - b.priority));
;

const runRulesOnDataset = ({rules,fn}) => datasets => {
  return datasets.map(dataset => {
    const reducer = fn(getRulesForDataset(rules)(dataset));
    return {
      ...dataset
      ,fullData: dataset.fullData && dataset.fullData.reduce(reducer,[])
      ,data: dataset.data && dataset.data.reduce(reducer,[])
    };
  });
};

const getField = (row, rule) => row[rule.field] || Object.values(row).join(" ");
const testRule = (row, rule) => rule.searchRe.test(getField(row,rule));

const colorReducer = (rules) =>  (acc,row) => acc.concat({
  ...rules.reduce((acc,rule) => {
    //if(res) {console.log("color res",rule.color, row[rule.field])}
    return (testRule(row,rule) ? {
      color:rule.color
      ,colorPriority:rule.priority
    } : undefined) || acc
  },{})
  , ...row
});

const rowFilterReducer = (rules) =>  (acc,row) => {
  const keepRow = rules.reduce((acc,rule) =>( 
    testRule(row,rule) || acc
  ),rules.length===0);  // if there are no rules, assume true to keep the dataset
  return keepRow ? acc.concat(row) : acc;
}

const testData = [
  {name:'test', data:[
    {'message': ' blah failure blah '},
    {'message': ' blah success blah '},
  ]},
  {name:'test2', data:[
    {'message': ' blah failure blah '},
    {'message': ' blah blah blah '},
  ]},
  {name:'another', data:[
    {'message': ' blah blah '},
    {'message': ' blah success blah '},
  ]},
];
export const addColors = runRulesOnDataset({rules:colorRules,fn:colorReducer});
export const filterDataRows = runRulesOnDataset({rules:filterRules,fn:rowFilterReducer});
/*
const res = addColors(testData);
console.log(JSON.stringify(res,null,2));
//*/