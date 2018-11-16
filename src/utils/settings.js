import {pipe,map,is,ifElse,join,identity} from 'ramda';
const qs = require('qs');

export const objectToQueryString = obj =>
  qs.stringify(obj, {format:'RFC1738',addQueryPrefix: true });

// query string to object
export const queryStringToObject = pipe(
  str=>qs.parse(str,{ ignoreQueryPrefix: true })
  ,map(
    ifElse(is(Array),join(' '),identity)
  )
);


