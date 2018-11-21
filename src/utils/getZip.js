// JSzipcan unzip a file in memory without filesystem -- 
const JSZip = require("jszip");
const {pipe,map,identity,tap} = require( 'ramda');
import {parser,logToData} from '../requestMapper';

//  - see https://stuk.github.io/jszip/documentation/api_jszip/file_regex.html
export const getZip = ({
  transform = identity
} = {}) => zippedData => 
  JSZip.loadAsync(zippedData)   // have zipped data, unzip it
    .then(pipe(
      zip => zip.file(/.+/)    // use regexp to get all files in zip
      ,map(zip=>zip            // for each file 
        .async("string")       //  - get the body of the file
        .then(parser(zip.name))
        .then(transform)       //  - transform the body
      )
      ,x=>Promise.all(x)       // return promise of all 
      //.then(console.log)
    ))   
    .catch(console.error);
      