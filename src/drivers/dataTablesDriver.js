import {pipe,head,keys,reject,map} from 'ramda';

// see https://datatables.net/forums/discussion/32542/datatables-and-webpack
// some details at https://datatables.net/download/npm
import $ from 'jquery' ;
import dt from 'datatables.net';
import 'datatables.net-dt/css/jquery.dataTables.css';
//import * as dtcol from 'dt-colresize';
//import 'dt-colresize/css/dataTables.colResize.css';

let datatable;
dt.ext.errMode = 'none';
//dt.ext.errMode = 'throw';

const preRenderer = (data,type,row,meta) =>    
  `<div style="font-family: Consolas,monospace;
      white-space: pre-wrap;
      word-break: keep-all;
      max-width:1000px;
      text-overflow: wrap;
      overflow: initial;"
  >${data}</div>`
;

const staticColumnDefs = {
  index: {width:100}
  ,date: {render:(data,type,row) => `<pre>${data}</pre>`}
  ,message: {width:'50%' ,render:preRenderer}
  ,text: {width:'50%' ,render:preRenderer}
};
const getColumnsFromFirstRowOfData = pipe(
  head,
  keys,
  reject(k=>k.substr(0,1)==='_'),
  map(key => ({
    ...staticColumnDefs[key]
    ,data: key
    ,title:key
  }))
);
const addIndexToObj = (o,index)=>({index:index+1,...o});
const cleanData = d=>d.map(addIndexToObj);
const isValidData = data => (!!data[0]);

const setupDataTable = ({
  tableDivId = 'tablediv',
  tableId = 'table'
}={}) => data => {

  // generally best just to redraw the whole table.... 
  try{
    datatable.destroy(true);
  } catch(e){}
  $('#' + tableDivId).html(`
    <table style="width:auto;align:left" class="stripe compact" id="${tableId}">
      <thead></thead>
    </table>
  `);
  
  const cData = cleanData(data);
  console.log("datatableDriver.setupDataTable", data);
  datatable = $('#'+tableId).DataTable({
    data: cData
    //,paging: false
    ,search: {regex: true}
    ,"language": { "search": "Filter table:"}
    ,columns: getColumnsFromFirstRowOfData(cData)
    ,fixedHeader: true
    ,stateSave: true
    ,stateDuration: 0    // 0 means no limit
    ,select: true
    ,paging: true
    ,pageLength:200 
    ,pagingType: "full_numbers"
    //,scrollY: 400
    //,colReorder: true
    ,dom: 'rBfipt'    //B
    ,responsive:true
    //,colResize: true
    //,autoWidth: true
    ,scrollX: false
  });
  datatable.on( 'error.dt', function (e, settings, techNote, message){
    console.error('DataTables error: ', message);
  })
};
/*
const updateTable = opts => data => {
  datatable.clear();
  datatable.rows.add(cleanData(data));
  datatable.draw();
};

*/
export const makeDataTablesDriver = opts => data$ => {

  data$.addListener({
    next: data => {
      if (isValidData(data)){
        setupDataTable(opts)(data)
      }
    },
    error: console.error,
    complete: () => {},
  });
  
  return undefined;     // no output - could add to handle clicks / selections etc
}
