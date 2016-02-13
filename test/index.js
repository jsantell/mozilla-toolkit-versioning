var expect = require('chai').expect;
var parse = require('../').parse;
var increment = require('../').increment;
var compare = require('mozilla-version-comparator');

describe('Sanity Checks', function () {
  patternMatch('1.2.3', '1.2.3.-1', '1.2.3.*');
  patternMatch('1.2.3.1',
    ['1.2.3.0', '1.2.3a'], // 1.2.3.* > v
    ['1.2.31', '1.2.4', '1.2.3.2pre']); // 1.2.3.* < v
});

describe('parse(version) single value', function () {
  testParse('1.2.3', '1.2.3', '1.2.3');
  testParse('>=1.2.3', '1.2.3', undefined);
  testParse('<=1.2.3', undefined, '1.2.3');
  testParse('>1.2.3', '1.2.3.1', undefined);
  testParse('<1.2.3', undefined, '1.2.3.-1');

  testParse('', undefined, undefined);
  testParse('*', undefined, '*');
  testParse('-', undefined, undefined);
  testParse(' 1.2.3 ', '1.2.3', '1.2.3');

  testParse('1.2.-1', '1.2.-1', '1.2.-1');
  testParse('>=1.2.-1', '1.2.-1', undefined);
  testParse('<=1.2.-1', undefined, '1.2.-1');
  testParse('>1.2.-1', '1.2.0', undefined);
  testParse('<1.2.-1', undefined, '1.2.-2');

  testParse('1.2.*', '1.2.*', '1.2.*');
  testParse('>=1.2.*', '1.2.*', undefined);
  testParse('<=1.2.*', undefined, '1.2.*');
  testParse('>1.2.*', '1.2.*.1', undefined);
  testParse('<1.2.*', undefined, '1.2.*.-1');

  testParse('1..', '1..', '1..');
  testParse('>=1..', '1..', undefined);
  testParse('<=1..', undefined, '1..');
  testParse('>1..', '1..1', undefined);
  testParse('<1..', undefined, '1..-1');

  testParse('1.0+', '1.1pre', '1.1pre');
  testParse('>=1.0+', '1.1pre', undefined);
  testParse('>1.0+', '1.1', undefined);
  testParse('<=1.0+', undefined, '1.1pre');
  testParse('<1.0+', undefined, '1.0');
});

describe('parse(version) range', function () {
  testParse('>=1.2.3 <=2.3.4', '1.2.3', '2.3.4');
  testParse('>1.2.3 <=2.3.4', '1.2.3.1', '2.3.4');
  testParse('>=1.2.3 <2.3.4', '1.2.3', '2.3.4.-1');
  testParse('>1.2.3 <2.3.4', '1.2.3.1', '2.3.4.-1');

  testParse('<=2.3.4 >=1.2.3', '1.2.3', '2.3.4');
  testParse('<=2.3.4 >1.2.3', '1.2.3.1', '2.3.4');
  testParse('<2.3.4 >=1.2.3', '1.2.3', '2.3.4.-1');
  testParse('<2.3.4 >1.2.3', '1.2.3.1', '2.3.4.-1');

  testParse('1.2.3pre1 - 2.3.4', '1.2.3pre1', '2.3.4');

  testParse('2.3.4 - 1.2.3', '1.2.3', '2.3.4');
  testParse('1.2.3 - 1.2.*', '1.2.3', '1.2.*');
  testParse('1.2.* - 1.2.3', '1.2.3', '1.2.*');

  testParse('1.2.3 -', '1.2.3', undefined);
  testParse('>=1.2.3 -', '1.2.3', undefined);
  testParse('<=1.2.3 -', undefined, '1.2.3');
  testParse('>1.2.3 -', '1.2.3.1', undefined);
  testParse('<1.2.3 -', undefined, '1.2.3.-1');
  testParse('- 1.2.3', undefined, '1.2.3');
  testParse('- >=1.2.3', '1.2.3', undefined);
  testParse('- <=1.2.3', undefined, '1.2.3');
  testParse('- >1.2.3', '1.2.3.1', undefined);
  testParse('- <1.2.3', undefined, '1.2.3.-1');
  testParse('- *', undefined, '*');
  testParse('* -', undefined, '*');

  testParse('1.0.-1 1.0pre10', '1.0pre10', '1.0.-1');
  testParse('1.0.-1 1.0.-2', '1.0.-2', '1.0.-1');
  testParse('1.0.-2 1.0pre10', '1.0pre10', '1.0.-2');
});

describe('increment(version)', function () {
  testInc('1.2.3', '1.2.3.1');
  testInc('1.2.3a', '1.2.3a1');
  testInc('1.2.3pre', '1.2.3pre1');
  testInc('1.2.3pre1', '1.2.3pre2');
  testInc('1.2', '1.2.1');
  testInc('1.2pre1a', '1.2pre1b');
  testInc('1.2pre1pre', '1.2pre1prf');

  testInc('1.2.-1', '1.2.0');
  testInc('1.2.*', '1.2.*.1');
  testInc('1..', '1..1');
  testInc('1.-1', '1.0');
  testInc('1.0+', '1.1');
});

function testParse (string, min, max) {
  it(string, function () {
    var parsed = parse(string);
    expect(parsed.min).to.be.equal(min);
    expect(parsed.max).to.be.equal(max);
  });
}

function testInc (string, expected) {
  it('increment: ' + string, function () {
    expect(increment(string)).to.be.equal(expected);
    expect(compare(string, expected)).to.be.equal(-1);
  });
}

function patternMatch (pattern, lessThan, greaterThan) {
  lessThan = [].concat(lessThan);
  greaterThan = [].concat(greaterThan);
  if (lessThan.length) {
    lessThan.forEach(function (v) {
      it(pattern + ' is greater than ' + v, function () {
        expect(compare(v, pattern)).to.be.equal(-1);
      });
    });
  }
  if (greaterThan.length) {
    greaterThan.forEach(function (v) {
      it(pattern + ' is less than ' + v, function () {
        expect(compare(v, pattern)).to.be.equal(1);
      });
    });
  }
}
