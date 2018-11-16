const {partition,filter,pipe,pluck,map,prop,zipObj,assoc} = require('ramda');
const scrapeIt = require("scrape-it");
const parseUrl = require('url-parse');

const getFolderContents = url => 
  scrapeIt(url, {
    links: {
      listItem: 'a[class]'
      ,data: {
        href: {attr: "href"}
        ,size: 'span.size'
      }
    }
  })
  .then(({ data, response }) => {
    //console.log(`Status Code: ${response.statusCode}`)
    const urlParsed =  parseUrl(url);
    return pipe(
      prop('links')
      ,partition(f=>f.size)
      ,map(pipe(
        filter(f=>f.href.length > urlParsed.pathname.length)
        ,pluck('href')
        ,map(href=>parseUrl(href,urlParsed.origin).href)
      ))
      ,zipObj(['files','folders'])
    )(data);
  });

const logJson = x=>console.log(JSON.stringify(x,null,2));

getFolderContents('http://localhost:8081/logs/Integration%20Server/Plugin_RIExtender/2018-10-17').then(logJson);
getFolderContents('http://localhost:8081/logs/Integration%20Server/Plugin_RIExtender/').then(logJson);

