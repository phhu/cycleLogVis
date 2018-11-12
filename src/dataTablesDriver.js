import $ from 'jquery' ;
import dt from 'datatables.net';
import 'datatables.net-dt/css/jquery.dataTables.css';
import * as R from 'ramda';

// see https://datatables.net/forums/discussion/32542/datatables-and-webpack
// some details at https://datatables.net/download/npm

let datatable;
dt.ext.errMode = 'none';
//dt.ext.errMode = 'throw';

const getColumnsFromFirstRowOfData = R.pipe(
  R.head,
  R.keys,
  R.reject(k=>k.substr(0,1)==='_'),
  R.map(key => ({data: key, title:key}) )
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
    <table class="stripe compact" id="${tableId}">
      <thead></thead>
    </table>
  `);
  
  const cData = cleanData(data);
  console.log("Setting up table: data:", data);
  datatable = $('#'+tableId).DataTable({
    data: cData
    //,paging: false
    ,search: {regex: true}
    ,columns: getColumnsFromFirstRowOfData(cData)
    ,fixedHeader: true
    //,stateSave: true
    ,stateDuration: 0    // 0 means no limit
    ,select: true
    ,"language": { "search": "Filter table:"}
    ,paging: true
    ,pageLength:200 
    ,pagingType: "full_numbers"
    //,scrollY: 400
    //,colReorder: true
    ,dom: 'rBfipt'    //B
    ,responsive:true
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
