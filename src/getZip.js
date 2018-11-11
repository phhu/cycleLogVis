const JSZip = require("jszip");
const {pipe,map,identity} = require( 'ramda');

//  - see https://stuk.github.io/jszip/documentation/api_jszip/file_regex.html
module.exports = ({
  transform = identity
} = {}) => ({body}) => 
  JSZip.loadAsync(body)   
    .then(pipe(
      zip => zip.file(/.*./)    // can use regexp to get files - here the first one   /// [0].async("string")
      ,map(zip=>zip
        .async("string")
        .then(transform)
      )
      ,x=>Promise.all(x)
    ))   
    .then(console.log)
    .catch(console.error);

// proof that can unzip a file -- see https://stuk.github.io/jszip/documentation/api_jszip/file_regex.html
// fetch('/data/2018-09-12-23-12-01-453.zip')
// .then(res=>res.blob())
// .then(JSZip.loadAsync)    
// //.then(zip=>zip.file("Plugin_RIExtender102.log.2018-09-12-23-12-01-453").async("string") )
// .then(zip=>zip.file(/.*/)[0].async("string") )   // can use regexp to get files
// .then(pipe(parseLog,text=>console.log("zipped file contents",text)))
// .catch(e=>console.error(e));