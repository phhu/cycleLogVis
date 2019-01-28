const {expect}= require('chai');
const parser = require('./parseBPXserverXML').bpxServerXmlToTimeline();
const R = require('ramda');
const fs = require('fs');

const testData = fs.readFileSync('dist/data/BPX-Server.xml');

const testOutput = [
  {
    date: '2018-11-28T13:43:25.503Z',
    millis: '1543412605503',
    sequence: '0',
    level: 'FINE',
    thread: '8',
    message: 'network: Version checking for wfm-fs-applet-lib.jar, specified version is 15.1.0.9624' 
  },
  { 
    date: '2018-11-28T13:43:25.504Z',
    millis: '1543412605504',
    sequence: '1',
    level: 'FINE',
    thread: '8',
    message: 'security: Blacklist revocation check is enabled' } 
];

parser(testData)
  //.then(x=>(console.log(x),x))
  //.then(x=>expect(x).to.eql(testOutput))
;
/*
describe("Parser", ()=>{
  it("should parse log file",)
})
*/