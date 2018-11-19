const {pipe,map,zipObj,unnest} = require('ramda');
const parseUrl = require('url-parse');
const request = require('superagent');

// recurse folders getting files
const getFilesInTree = folder => {
  const ff = folder.files || [];
  const fc = folder.folderContents;
  return fc ? ff.concat(unnest(map(getFilesInTree,fc))) : ff;
}

const folderRe = /(?<=href=")[^".]+(?=")/gi;        //folders don't have a dot
const fileRe = /(?<=href=")[^".]+\.[^"]*(?=")/gi;   //files have a dot in them

const getFullUrl = (f,origin) => parseUrl(f,origin).href;

const getFolderContents = url => {
  //console.log("getFolderContents",url);
  const urlParsed =  parseUrl(url);
  return request.get(url)
  .then(res => {
    const html = res.text || '' ;
    const folders = (html.match(folderRe) || [])
      .filter(f=>f.length > urlParsed.pathname.length);
    const files = html.match(fileRe) || [];
    return [files,folders];
  })
  .then(async (data) => {
    const ret = pipe(
      map(map(href=>getFullUrl(href,urlParsed.origin)))     // add the base of the original url
      ,zipObj(['files','folders'])      // make object
    )(data);
    // recurse folder structure
    ret.folderContents = await Promise.all(ret.folders.map(f=>getFolderContents(f)));
    return ret;
  })
  .catch(err => console.error("Error in getFolderContents", err))
};

export const getFilesUnderFolder = url => 
  getFolderContents(url)
  .then(getFilesInTree)
<<<<<<< HEAD
  .catch(err => console.error("Error in getFilesUnderFolder", err))
=======
>>>>>>> 4871e6a84b6c961c42250ec3a56fe5e61dc06272
  //.then(logJson("files"))
;
/*module.exports = {
  getFilesUnderFolder
};*/

/*const logJson = label => x=>{
  console.log(label,JSON.stringify(x,null,2));
  return x;
}*/

//getFolderContents('http://localhost:8081/logs/Integration%20Server/Plugin_RIExtender/2018-10-17').then(logJson('f1'));
/*
const test = () =>
  getFolderContents('http://localhost:8081/logs/Integration%20Server/Plugin_RIExtender/')
  .then(getFilesInTree)
  .then(logJson('f2'));

test();
*/
/*
const testData = {
  files:["f1","f2"]
  ,folderContents: [{
    files:["f3","f4"]
    ,folderContents: [{
      files:["f5","f6"]
      ,folderContents: []   
    },{
      files:["f7","f8"]
      //,folderContents: []   
    }]   
  }]
};
logJson("merged")(mergeFolders(testData));
console.log();
*/

  /*return scrapeIt(url, {
    links: {
      listItem: 'a'    // could add [class], but easier to filter later by url length
      ,data: {
        href: {attr: "href"}
        ,size: 'span.size'
      }
    }
  })*/


        //prop('links')
      //,partition(f=>f.size)     //files have sizes, folders don't 
      //filter(f=>f.href.length > urlParsed.pathname.length)    // subfolders and files must have longer paths
      //,pluck('href')