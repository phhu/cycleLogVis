import * as d3 from "d3";
//import eventDrops from 'event-drops';
import {adapt} from '@cycle/run/lib/adapt';
import xs from 'xstream';
const moment = require('moment');

import eventDrops from '../../../../Documents/GitHub/eventDrops/dist';
import './style.css';

//import {clone} from 'ramda';
import {parse as toDate, startOfToday, startOfTomorrow} from 'date-fns';

const tooltip = d3
  .select('body')
  .append('div')
  .classed('tooltip', true)
  .style('opacity', 0)
  .style('pointer-events', 'auto');

const getAllEvents = x=>x['_allEvents'];
  
// have a look in https://github.com/marmelab/EventDrops/blob/master/src/config.js for examples
const makeChart = opts => eventDrops({
  metaballs: false,
  range: {
    start: 
      opts.relativeDates ? moment().add(moment.duration(opts.start)) :
      opts.startDate ? new Date(opts.startDate) : 
      startOfToday(),
    end: 
      opts.relativeDates ? moment().add(moment.duration(opts.end)) :
      opts.endDate ?  new Date(opts.endDate) : 
      startOfTomorrow(),
  },
  drop: {
    date: d => toDate(d.date || d.dateParsed || d.dateRaw),
    radius: (data,index) => Math.min(4 + Math.pow(data._allEvents.length,1/2),20),
    color: (data,index) => {
      const coloredRows = data._allEvents.filter(r=>r.color);
      return (data._allEvents.reduce((acc,row)=>{
        if (row.colorPriority && row.colorPriority > acc.priority){return {color:row.color,priority:row.colorPriority};} 
        if (row.color && acc.priority < 1){return {color:row.color,priority:1}; }
        return acc;
      },{color:'black',priority:0})).color;
      //const i =  data._allEvents.findIndex(e=>e.color);
      //return  (i > -1) ? data._allEvents[i].color : 'black';
    },
    /*colorOld: (data,index) => {
      const colors = {
        'COMPLETED': 'green',
        'FAILED' : 'red'
      }; 
      // should use a regexp test here?
      return Object.entries(colors).reduce((acc,[keyword,color])=>(
          data._allEvents.some(e=>(e.text === keyword || e.message === keyword )) ? color :acc 
      ),'black');  
    },*/
    onClick: function (data,index) {
      console.log("Clicked drop:" ,index , this, "data:", data);
      //data.lastClicked = true;
      //d3.select(this).attr('fill','yellow');
      update({type:'DROP_CLICK', payload: getAllEvents(data)});
    },
    onMouseOver: data =>
      tooltip
        .html(`
          <div class="commit"> 
          <div class="content">
          ${data._allEvents.length} events`
          + (data._allEvents[0].index ? ` (First index: ${data._allEvents[0].index})`  : '')
          + data._allEvents.slice(0,25).map(e => `
              <div class="message">
                <strong>${e.dateRaw || e.date}</strong> 
                - ${e.text || e.message}
                </div>
          `).join('') +
          `</div>`
        )
        .style('left', `${d3.event.pageX - 410}px`)
        .style('top', `${d3.event.pageY + 20}px`)
        .transition()
        .duration(100)
        .style('opacity', 1)
        .style('pointer-events', 'auto'),
    onMouseOut: () => 
      tooltip
        .transition()
        .duration(100)
        .style('opacity', 0)
        .style('pointer-events', 'none')
  },
  zoom: {
    //onZoom: (data) => console.log("onZoom"),
    //onZoomStart: (data) => console.log("onZoomStart"),
    onZoomEnd: (data,index,svg) => {
      const [startDate,endDate] = chart.scale().domain();
      //console.log("zoomEnd: dates:",startDate,endDate);
      update({type:'ZOOM_END', payload: {
        startDate: moment(startDate).toISOString().replace(/Z$/,'')
        ,endDate: moment(endDate).toISOString().replace(/Z$/,'')
      }});
    }
  },
  d3,
  label: {
    padding: 20,
    width: 400,
    text: d => `${d.name} (${d.data.length} / ${d.fullData.length})`
  },
  line :{
    //color: (line,index) => {console.log(line,index);return 'red' ; (/.*\]\*\*/.test(line.name) ? 'red' : 'blue')}
  },
});

var update = ()=>{};    // initial function does nothing - only once stream set up 
var chart;              // reference to chart - gets updated
//const bump = f => setTimeout(f,0);

const updateChart = (opts = {}) => data => {
  //const chartData = clone(data);    // it gets mutated.... so clone it??
  const chartData = data;
  console.log("eventDropDriver.updateChart:",chartData);
  setTimeout(()=>{
    d3.select("svg").remove();    // get rid of chart first, otherwise it breaks
    chart = makeChart(opts);
    d3.select(opts.tag).data([chartData]).call(chart); 
  });
};

export const makeEventDropDriver = opts => data$ => {
  data$.addListener({
    next: updateChart(opts),
    error: console.error,
    complete: () => {},
  });
  return adapt( 
    xs.create({
      start: listener => {
        update = data => listener.next(data)
      } 
      ,stop: () => {},
    })
  );
}

//  a test data set 
export const testData = [ {
  "name": "* Test Data for event drop driver *",
  "data": [
    {
      "date": "2018-10-21 03:30:26",
      "text": "FAILED",
      "type": "2"
    },
    {
      "date": "2018-10-21 03:30:00",
      "text": "STARTED",
      "type": "0"
    }
  ]
}];