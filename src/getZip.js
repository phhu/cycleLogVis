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