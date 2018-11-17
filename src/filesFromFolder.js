const {partition,filter,pipe,pluck,map,prop,zipObj,unnest} = require('ramda');
const scrapeIt = require("scrape-it");
const parseUrl = require('url-parse');

// recurse folders getting files
const getFilesInTree = folder => {
  const ff = folder.files || [];
  const fc = folder.folderContents;
  return fc ? ff.concat(unnest(map(getFilesInTree,fc))) : ff;
}

const getFolderContents = url => {
  console.log("getFolderContents",url);
  return scrapeIt(url, {
    links: {
      listItem: 'a'    // could add [class], but easier to filter later by url length
      ,data: {
        href: {attr: "href"}
        ,size: 'span.size'
      }
    }
  })
  .then(async ({ data, response }) => {
    console.log(url, `Status Code: ${response.statusCode}`)
    const urlParsed =  parseUrl(url);
    const ret = pipe(
      prop('links')
      ,partition(f=>f.size)     //files have sizes, folders don't 
      ,map(pipe(
        filter(f=>f.href.length > urlParsed.pathname.length)    // subfolders and files must have longer paths
        ,pluck('href')
        ,map(href=>parseUrl(href,urlParsed.origin).href)     // add the base of the original url
      ))
      ,zipObj(['files','folders'])      // make object
    )(data);
    // recurse folder structure
    ret.folderContents = await Promise.all(ret.folders.map(f=>getFolderContents(f)));
    return ret;
  })
};

const logJson = label => x=>console.log(label,JSON.stringify(x,null,2));

export const getFilesUnderFolder = url => 
  getFolderContents(url)
  .then(getFilesInTree)

/*module.exports = {
  getFilesUnderFolder
};*/

//getFolderContents('http://localhost:8081/logs/Integration%20Server/Plugin_RIExtender/2018-10-17').then(logJson('f1'));
/*
const test = () =>
  getFolderContents('http://localhost:8081/logs/Integration%20Server/')
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