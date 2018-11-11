import $ from 'jquery' ;
import dt from 'datatables.net';
import 'datatables.net-dt/css/jquery.dataTables.css';
//import {testData} from './eventDropDriver';
import * as R from 'ramda';
// see https://datatables.net/forums/discussion/32542/datatables-and-webpack
// some details at https://datatables.net/download/npm

var datatable;
dt.ext.errMode = 'none';
//dt.ext.errMode = 'throw';

const getColumns = R.pipe(
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

  try{
    datatable.destroy();
  } catch(e){}
  $('#' + tableDivId).html(`<table class="stripe compact" id="${tableId}"><thead></thead></table>`);
  
  const cData = cleanData(data);
  datatable = $('#'+tableId).DataTable({
    data: cData,
    paging: false,
    search: {regex: true},
    columns: getColumns(cData)
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

const remakeTable = opts => data => {
  try{datatable.destroy();}catch(e){}
  $('#tablediv').html('<table class="stripe compact" id="table"><thead></thead></table>');
  setupDataTable(opts)(data);
}
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
  
  return undefined;     // no output - might do some if 
}



/*
		var remakeTable = function(){
			try{
				table.destroy(true);
			} catch (e){
				//console.log("no table to destroy",e);
			}
			console.log("remaking table");
			$.fn.dataTable.ext.errMode = 'none';
			
			var myIndex = indexVal();
			getIndexFields(myIndex).then(function(indexFields){
			
				var opts = datatableOptions({
					index:myIndex
					,indexFields:indexFields
				});
				
			
				
				//console.log("opts",JSON.stringify(opts,null,2));
				//destroy rips out the original table, so (re)create it 
				$('#tablediv').html('<table class="stripe compact" id="table"><thead></thead></table>');
				table = $('#table')
					.on( 'error.dt', function (e, settings, techNote, message){
						console.error('DataTables error: ', message);
					})
					.on( 'column-visibility.dt', function ( e, settings, column, state ) {
						// see https://datatables.net/reference/event/column-visibility - to preserve column visibilty settings
						try{
							var c = columnSet[indexVal()][column];
							c.visible = c.bVisible = state;
						} catch(e){
							console.error("error recording column visibility", e);
						}
					})
					.DataTable(opts)
				;

				table.on('init',function(){
					console.log("init");
					table.on('draw',drawFunc);
					table.draw();
					q.focus();
				});					
			});
		};
    
  */