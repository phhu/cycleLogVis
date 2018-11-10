import xs from 'xstream';
import {run} from '@cycle/run';
import {makeDOMDriver,h1,div,input,p} from '@cycle/dom';
import Snabbdom from 'snabbdom-pragma';

import R from 'ramda';

function main(sources) {
  const sinks = {
    DOM: sources.DOM.select('input').events('click')
      .map(ev => ev.target.checked)
      .startWith(true)
      .map(toggled =>
        <div>
          <div>
            <input type="checkbox" checked/> Toggle me!
            <p>{toggled ? 'ON' : 'off'}</p>
          </div>
       
        </div>
      )
  };
  return sinks;
}

const drivers = {
  DOM: makeDOMDriver('#app')
};


run(main, drivers);