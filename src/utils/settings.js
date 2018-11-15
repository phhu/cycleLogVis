import {pipe,map,is,ifElse,join,identity} from 'ramda';
const qs = require('qs');

export const makeQueryString =  settings =>
  qs.stringify(settings, {format:'RFC1738',addQueryPrefix: true });

export const getInitialSettings = pipe(
  x=>qs.parse(x,{ ignoreQueryPrefix: true })
  //,debug('initialSettings')
  ,map(
    ifElse(is(Array),join(' '),identity)
  )
);


