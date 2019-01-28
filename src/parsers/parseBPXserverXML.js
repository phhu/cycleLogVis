const R = require('ramda')
  ,xml2js = require('xml2js')
  ,moment = require('moment')    //needs to be replaces with date-fns
  //,fs = require('fs')
  //,{parse,format} = require('date-fns')
;

// *** xml to json
// see https://www.npmjs.com/package/xml2js for options 
const xmlOpts = {
  explicitRoot:0
  ,mergeAttrs:1
  ,explicitArray:0
  ,normalizeTags:1
};
//const xmlToJson = xml => xml2js.parseString(xmlOpts)(xml); 
//const stringifyJSON = x=>JSON.stringify(x,null,2);
//const logJson = R.tap(R.pipe(stringifyJSON,console.log));  

// *** normalise the structure a little  
const normaliseStructure = d => 
  Object.entries(d).map(([key,value])=>{
    const [unusedArray,type,id,cat] = /^([a-z]+)([0-9]*)-([a-z]+)$/.exec(key) || [[],null,null,null];
    return {
      id
      ,type
      ,cat
      ,...value
    };    
  });
    /*const idn = parseInt(id || 0) ;    // there isn't always an ID
    o[type] = o[type] || {} ;
    o[type][idn] = o[type][idn] || {};
    o[type][idn][cat] = value;
    return o;
  },{})*/
;
  
// *** get useful data
const reduceObjectToArray = ({
  filterRe=/.*/,
  transform = R.identity,
}={}) => o => R.reduce((acc,[key,value]) => {
  const t = filterRe.exec(key);
  if (t){
    acc[t[1]] = {
      ...(acc[t[1]] || {}),     // keep existing
      key,
      ...(transform(value))
    };
  }
  return acc;
},[],R.toPairs(o));

const dateFormat = {message:"ddd MMM D HH:mm:ss ZZ YYYY"};
//should use date-fns instead
const parseDate = ({
  inputFormat='h:m a on MMMM D, YYYY',    // see https://momentjs.com/docs/#/parsing/
  outputFormat='YYYY-MM-DD HH:mm:ss',
}={}) => d => moment(d,inputFormat).format(outputFormat);

const reduceMessage = m => ({
  date: parseDate({inputFormat:dateFormat.message})(m.date.VALUE),
  text: m.text.VALUE,
  type: m.type.VALUE,
});

const lens = {};
lens.user_rules = R.lensPath(['configure','user_rules']);
lens.user_name = R.lens(R.pipe(
  R.path(['configure','user_rules']),
  R.propOr([],'replace'),
  R.find(R.pathSatisfies(
    R.test(/\/\/UI_SETTINGS\/\/USER_NAME$/),['XPATH']
  )),
  R.prop('VALUE'), 
),null);
lens.last_trigger_time = R.lensPath(['status','last_trigger_time','VALUE'])

const tableMappings = {
  'generic': (type,id,x,root) => ({
    id
    ,type
    ,last_trigger_time: R.pipe(
      R.view(lens.last_trigger_time)
      ,parseDate()
    )(x)
    ,status_settings_max_msgs: R.path([
      'status'
      ,'status_settings_max_msgs'
      ,'VALUE'
    ])(x)
    ,user_name: R.view(lens.user_name)(x)
    ,messages: (
      (x.status && x.status.status_msgs) ? 
        reduceObjectToArray({filterRe: /^element(\d+)$/})(x.status.status_msgs[type+id]) : 
        []
    ).map(reduceMessage)
    ,user_rules: x.configure && 
      x.configure.user_rules && 
      x.configure.user_rules.replace && 
      [].concat(x.configure.user_rules.replace)
        .reduce((acc,i)=>{
          const [res,id,desc] = /^.*\/\/Element(\d+)\/\/(.*)$/.exec(i.XPATH) || [[],null,null];
          if (res){
            const targetType = i.VALUE.replace(/^(.*?)(\d*)?$/,"$1").toLowerCase();
            const targetId = i.VALUE.replace(/^(.*?)(\d*)?$/,"$2") || 0;
            //console.log(targetType,targetId);
            acc[id] = Object.assign(
              acc[id] || {},
              {[desc]: i.VALUE},
              desc === 'IOP_ID' ? {
                  type: targetType, 
                  id: targetId,
                  //pointer: root[targetType][targetId],
              } : {}
            )
          };
          return acc; 
        },[])
  }),
}

const getUsefulData = R.mapObjIndexed( (list,type,root) => 
  R.mapObjIndexed( 
    (x,id) =>
      R.merge(x,(tableMappings.generic)(type,id,x,root))
      //R.assoc("useful", (tableMappings[type] || tableMappings.generic)(type,id,x,root))(x),
    ,list
  )
);

// *** flatten data
const flattenData = R.pipe(
  R.values,
  R.map(R.values),
  R.unnest,
);  

// *** make timeline data
const sortTable = R.sortWith([
  R.ascend(R.prop('type')),
  R.ascend(R.prop('user_name')),
  R.ascend(R.prop('id')),
]);

const makeTimelineData = d => {
  console.log("d",d);
  const flatData = flattenData(d);
  console.log("flatData",flatData);
  return R.pipe(
    //R.filter(R.propEq('type','gm')),     // only gm records
    //R.filter(R.pathSatisfies(
    //  R.test(/^SC.*/),['user_name']
    //)),
    R.tail,
    sortTable,
    R.tap(x=>console.log("sorted table",x)),
    /*R.reduce((acc,i)=>{return acc.concat(
        [i],
        R.map(ur=> {
          console.log("ur",ur);
          const ret = d[ur.type][ur.id];
          ret.isChild = true;
          ret.user_name = ur.DESCRIPTION || ret.user_name;
          return ret;
        },i.user_rules)
      )}
    ),*/
    R.tap(x=>console.log("sorted table2",x)),
    R.map(i=>({
      name: i.user_name + "[" +i.type.toUpperCase() + i.id + "]" + (i.isChild ? "**" : ""),
      data: i.messages,
    })),
  )(flatData);
};

const interestingEntries = R.reduce((a,i)=>a.concat( 
  i+'-configure',
  i+'-status'
  ),[])

const getMessages = d => {
  d.messages = (d.status_msgs ? 
    reduceObjectToArray({filterRe: /^element(\d+)$/})(d.status_msgs[d.type+d.id]) : 
      []
  ).map(reduceMessage);
  return d;
}

const getUserName = d => {
  d.username = (d.cat === 'configure' ? 
    R.propOr('???','VALUE',R.find(
      R.propSatisfies(x=>x.match(/\/USER_NAME$/),'XPATH')
      ,d.user_rules.replace
    )) : '');
  return d;
}

const reduceIndexed = R.addIndex(R.reduce);

const bpxServerXmlToTimeline = ({
  entries=[]
}={}) => xml => new Promise((resolve,reject)=> {
  xml2js.parseString(xml,xmlOpts,(err,result) => {
    //console.log("test");
    if (err){reject(err);}
    const pipe = R.pipe(
      //R.pick(interestingEntries(entries))   //  [ 'timer100','timer106', 'gm101' ]
      normaliseStructure
      ,R.map(getMessages)
      ,R.map(getUserName)
      ,reduceIndexed((acc,d,i,arr)=>{
        //console.log("arr",i,d.type,d.id,d.cat);
        if (d.cat === 'status' && d.messages){
          const config = R.find(
            x=>(x.cat==='configure' && x.id===d.id && x.type===d.type)
            ,arr
          ) || {};
          acc.push({
            'name': config.username + ' [' + d.type + d.id + ']', 
            config, 
            status: d,
            'data': d.messages,
          });
        }
        return acc;
      },[])
      /*,R.sortWith([
        R.ascend(R.prop('type')),
        R.ascend(R.prop('id')),
        R.ascend(R.prop('cat')),
      ])*/
      /*R.map(i=>({
        name: i.username + "[" +i.type.toUpperCase() + i.id + "]" + (i.isChild ? "**" : ""),
        data: i.messages,
      })*/
      //,R.tap(x=>console.log("XMLdata",JSON.stringify(x,null,2)))
      //,d => fs.writeFile('data.json',JSON.stringify(d,null,2))
      //,getUsefulData
      //,flattenData
      //,makeTimelineData
      //,R.tap(x=>console.log("XMLdata",JSON.stringify(x,null,2)))
    );
    resolve(pipe(result));
  }); 
});  

module.exports = {
  bpxServerXmlToTimeline
};