const {getDate,format,durationBetween} = require('./dates');
const {expect} = require('chai');
const moment = require('moment');

const base = format(new Date(2018,0,01,13,00,00));

expect(getDate('2018-01-02 12:30:23')).to.equal('2018-01-02T12:30:23.000')
expect(getDate('2018-01-02T12:30:23.345')).to.equal('2018-01-02T12:30:23.345')
//expect(getDate('12:30:23.345')).to.equal('2018-01-02T12:30:23.345')
//expect(getDate('fake',now)).to.equal(now)
expect(getDate('P1Y01M02DT12H30M23S',base)).to.equal('2019-02-04T01:30:23.000')
expect(getDate('+5m' ,base)).to.equal('2018-01-01T13:05:00.000')
expect(getDate('-5s' ,base)).to.equal('2018-01-01T12:59:55.000')
expect(getDate('+5ms',base)).to.equal('2018-01-01T13:00:00.005')

expect(durationBetween('2018-01-01T13:05:01',base)).to.equal('PT5M1S');

//console.log(getDate('+P2018Y01M02DT12H30M23S'));
//console.log(getDate('+15m'));
//console.log("fake",getDate('FAKE'));
//console.log(getDate('+1h5m0s'));