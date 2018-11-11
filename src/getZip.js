const JSZip = require("jszip");
const {pipe,map,identity} = require( 'ramda');

//  - see https://stuk.github.io/jszip/documentation/api_jszip/file_regex.html
module.exports = ({
  transform = identity
} = {}) => zippedData => 
  JSZip.loadAsync(zippedData)   
    .then(pipe(
      zip => zip.file(/.+/)    // can use regexp to get all files
      ,map(zip=>zip
        .async("string")
        .then(transform)
      )
      ,x=>Promise.all(x)
    ))   
    //.then(console.log)
    .catch(console.error);

// can unzip a file in memory without filesystem -- see https://stuk.github.io/jszip/documentation/api_jszip/file_regex.html
// fetch('/data/2018-09-12-23-12-01-453.zip')
// .then(res=>res.blob())
// .then(JSZip.loadAsync)    
// //.then(zip=>zip.file("Plugin_RIExtender102.log.2018-09-12-23-12-01-453").async("string") )
// .then(zip=>zip.file(/.*/)[0].async("string") )   // can use regexp to get files
// .then(pipe(parseLog,text=>console.log("zipped file contents",text)))
// .catch(e=>console.error(e));