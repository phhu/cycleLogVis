import $ from 'jquery' ;
import dt from 'datatables.net';
import 'datatables.net-dt/css/jquery.dataTables.css';
//import {testData} from './eventDropDriver';
import * as R from 'ramda';
// see https://datatables.net/forums/discussion/32542/datatables-and-webpack
// some details at https://datatables.net/download/npm

var datatable;
dt.ext.errMode = 'throw';

const getColumns = R.pipe(
  R.head,
  R.keys,
  R.map(key => ({data: key, title:key}) )
);
const addIndexToObj = (o,index)=>({index:index+1,...o});
const cleanData = R.map(addIndexToObj);
const isValidData = data => (!!data[0]);

const setupDataTable = ({tag}) => data => {
  const cData = cleanData(data);
  datatable = $('#table').DataTable({
    data: cData,
    paging:false,
    "search": {
      "regex": true
    },
    columns: getColumns(cData)
  })
};

const updateTable = data => {
  datatable.clear();
  datatable.rows.add(cleanData(data));
  datatable.draw();
};

export const makeDataTablesDriver = (opts) => data$ => {

  data$.addListener({
    next: data => {
      if (!datatable && isValidData(data)){
        setupDataTable(opts)(data)
      } else if (datatable){
        updateTable(data);
      }
    },
    error: console.error,
    complete: () => {},
  });
  
  return undefined;     // no output - might do some if 
}