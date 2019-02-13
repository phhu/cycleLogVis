const {expect} = require('chai');
const {parser} = require('./standardiseObject');

it('should handle colors',()=>{
  expect(parser('color')('"test"')).to.eql(`[{"color":"red","search":"test"}]`);
  expect(parser('color')('{red:"test"}')).to.eql(`[{"color":"red","search":"test"}]`);
  expect(parser('color')('[{ "color":"red","search":"test"} ]')).to.eql(`[{"color":"red","search":"test"}]`);
})

it('should handle filters',()=>{
  expect(parser('filter')('"test"')).to.eql(`[{"search":"test"}]`);
})

it('should handle substitution',()=>{
  expect(parser('substitution')('"test"')).to.eql('{"%s":"test"}');
  expect(parser('substitution')('{"%s":"test"}')).to.eql('{"%s":"test"}');
})

/*
expect(parser('substitution')('[{"%s":"test"},{"%t":"testa"}]')).to.eql(
  [
    {search:'%s',replacement:'test'},
    {search:'%t',replacement:'testa'}
  ]
);
*/