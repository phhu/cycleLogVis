import * as d3 from "d3";
//import eventDrops from 'event-drops';
import eventDrops from '../../../Documents/GitHub/eventDrops/dist';
import xs from 'xstream';
import './style.css';

// see https://cycle.js.org/drivers.html#drivers-how-to-make-drivers. 
//Adapt needed if we return something 
import {adapt} from '@cycle/run/lib/adapt';
import * as R from 'ramda';

const tooltip = d3
  .select('body')
  .append('div')
  .classed('tooltip', true)
  .style('opacity', 0)
  .style('pointer-events', 'auto');

const getAllEvents = R.prop('_allEvents');
  
// have a look in https://github.com/marmelab/EventDrops/blob/master/src/config.js for examples
const chart = eventDrops({
  metaballs: false,
  range: {start: new Date(2018,9,18),end: new Date(2018,9,22)},
  drop: {
    date: d => new Date(d.dateParsed || d.dateRaw || d.date),
    radius: (data,index) => Math.min(4 + Math.pow(data._allEvents.length,1/2),20),
    color: (data,index) => {
      const colors = {
        'COMPLETED': 'green',
        'FAILED' : 'red'
      }; 
      return Object.entries(colors).reduce((acc,[text,color])=>(
          data._allEvents.some(e=>e.text === text) ? color :acc 
      ),'black');  
    },
    onClick: data => {
      console.log("Clicked drop: data:", data);
      update(getAllEvents(data));
    },
    onMouseOver: data =>
      tooltip
        .html(`
          <div class="commit"> 
          <div class="content">${data._allEvents.length} events:` +
          data._allEvents.slice(0,25).map(e => `
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
  d3,
  label: {
    padding: 20,
    width: 400,
    text: d => `${d.name} (${d.data.length})`
  },
  line :{
    color: (line,index) => (/.*\]\*\*$/.test(line.name) ? 'red' : 'blue')
  },
});

var update = R.F;    // initial function does nothing - only once stream set up 


const updateChart = ({tag}) => data => {
  console.log("data for chart",data);
  d3.select("svg").remove();    // get rid of chart first, otherwise it breaks
  d3.select(tag).data([data]).call(chart); 
}

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

export const testData = [ {
  "name": "Speech Source Measure Export Adapter[RIEXTENDER102]**",
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