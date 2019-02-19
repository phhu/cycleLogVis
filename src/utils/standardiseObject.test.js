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
  //expect(parser('substitution')('"test"')).to.eql('"test"');
 expect(parser('substitution')('"test"')).to.eql('{"%x":"test"}');
  //expect(parser('substitution')('{"%x":"test"}')).to.eql('{"%x":"test"}');
})

/*
expect(parser('substitution')('[{"%x":"test"},{"%t":"testa"}]')).to.eql(
  [
    {search:'%x',replacement:'test'},
    {search:'%t',replacement:'testa'}
  ]
);
*/