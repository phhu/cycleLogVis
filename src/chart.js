import * as d3 from "d3";
//import eventDrops from 'event-drops';
import eventDrops from '../../../Documents/GitHub/eventDrops';


const tooltip = d3
    .select('body')
    .append('div')
    .classed('tooltip', true)
    .style('opacity', 0)
    .style('pointer-events', 'auto');

// have a look in https://github.com/marmelab/EventDrops/blob/master/src/config.js for examples
const chart = eventDrops({
  metaballs: false,
  //range: {start: new Date(2018,9,18),end: new Date(2018,9,22)},
  drop: {
    date: d => new Date(d.date),
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
    /*onClick: data => {
      //console.log("clicked");
      document.querySelector('#text').innerHTML  = `
      <div class="commit">
      <table class="content">` +
      data._allEvents.map((e,i) => `
          <tr><td>${i+1} - ${e.date} - ${e.level || ''} - ${e.text}</td><tr />
      `).join('') +
      `</table>`
    },*/
    onMouseOver: data => {
      console.log(data);
      tooltip
        .transition()
        .duration(100)
        .style('opacity', 1)
        .style('pointer-events', 'auto');
      tooltip
        .html(`
          <div class="commit">
          <div class="content">` +
          data._allEvents.map(e => `
              <h3 class="message">${e.date} - ${e.text}</h3>
          `).join('') +
          `</div>`
        )
        .style('left', `${d3.event.pageX - 30}px`)
        .style('top', `${d3.event.pageY + 20}px`);
    },
    onMouseOut: () => {
      tooltip
          .transition()
          .duration(500)
          .style('opacity', 0)
          .style('pointer-events', 'none');
    }
  },
  d3,
  label: {
    padding: 20,
    text: d => `${d.name} (${d.data.length})`,
    width: 400
  },
  line :{
    color: (line,index) => {
      //console.log("line",line); 
      return /.*\]\*\*$/.test(line.name) ? 'red' : 'blue';
    }
  },
});


const testData = [ {
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
// /*/
export default ({tag},data) => {
  console.log("dataForChart",data);
  // console.log("testDataForChart",testData);
  d3.select("svg").remove();    // get rid of chart first, otherwise it breaks
  d3.select(tag).data([data]).call(chart); 
}