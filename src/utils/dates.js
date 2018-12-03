const moment = require('moment');
const parseDuration = require('parse-duration');

const format = d => moment(d).format("YYYY-MM-DDTHH:mm:ss.SSS");

const getDate = (input,base) => {
  let ret;
  base = moment(base);
  ret = format(input);
  if (ret !== 'Invalid date'){
    return ret;
  } else {
    let dur = moment.duration(input);
    //console.log("dur",dur.toString());
    if (dur.toString() === 'P0D'){
      dur = parseDuration(input);
      //console.log("dur2",dur);
      ret = base.add(dur,'ms');
    } else {
      ret = base.add(dur);
    }
    return format(ret);
  }
}

const durationBetween = (input,base) => moment.duration(moment(input).diff(moment(base))).toISOString();

module.exports ={
  getDate
  ,format
  ,durationBetween
};