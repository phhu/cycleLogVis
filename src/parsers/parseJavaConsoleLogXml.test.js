const {expect}= require('chai');
const parser = require('./parseJavaConsoleLogXml')({});
//const R = require('ramda');
const testData = `
<?xml version="1.0" encoding="windows-1252" standalone="no"?>
<!DOCTYPE log SYSTEM "logger.dtd">
<log>
<record>
  <date>2018-11-28T08:43:25</date>
  <millis>1543412605503</millis>
  <sequence>0</sequence>
  <logger>sun.plugin</logger>
  <level>FINE</level>
  <class>com.sun.deploy.trace.LoggerTraceListener</class>
  <method>print</method>
  <thread>8</thread>
  <message>network: Version checking for wfm-fs-applet-lib.jar, specified version is 15.1.0.9624
</message>
</record>
<record>
  <date>2018-11-28T08:43:25</date>
  <millis>1543412605504</millis>
  <sequence>1</sequence>
  <logger>sun.plugin</logger>
  <level>FINE</level>
  <class>com.sun.deploy.trace.LoggerTraceListener</class>
  <method>print</method>
  <thread>8</thread>
  <message>security: Blacklist revocation check is enabled
</message>
</record>
</log>
`;

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
  .then(x=>(console.log(x),x))
  .then(x=>expect(x).to.eql(testOutput))
;
/*
describe("Parser", ()=>{
  it("should parse log file",)
})
*/