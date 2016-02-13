/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';
var compareVersions = require('mozilla-version-comparator');

// Expressions to match Mozilla's Toolkit Format.
// https://developer.mozilla.org/en-US/docs/Toolkit_version_format
var VERSION_PART = '(?:(?:-?[\\d]+)?(?:[!-\\-\\/:-~]+)?){2}';
var VERSION_PART_CAPTURE = '(-?[\\d]+)?([!-\\-\\/:-~]+)?(-?[\\d]+)?([!-\\-\\/:-~]+)?';
var VERSION_FORMAT = '(?:' + VERSION_PART + ')?(?:\.(?:' + VERSION_PART + ')?)*';
var COMPARATOR = '[><]=?';
var VERSION_STRING = '(' + COMPARATOR + ')?(' + VERSION_FORMAT + ')';
var INPUT_SYNTAX = VERSION_STRING + '(?:(?:\\s+-)?\\s+' + VERSION_STRING + ')?';
var ERROR_MESSAGE = '`parse` argument must be a populated string.';

exports.parse = function (input) {
  if (!input) {
    return exceptionalInput('');
  }
  if (!(typeof input === 'string' || input instanceof String) ||
      !(new RegExp('^\\s*' + INPUT_SYNTAX + '\\s*$')).test(input)) {
    throw new Error(ERROR_MESSAGE);
  }
  input = input.trim();
  if (/^(?:[\*\-])?$/.test(input)) {
    return exceptionalInput(input);
  }
  input = input.split(/\s+/);
  if (input.length < 1 || input.length > 3) {
    throw new Error(ERROR_MESSAGE);
  }

  var min, max, verL, verR, parsed;
  var exp = new RegExp('^' + VERSION_STRING + '$');
  // 1.2.3 - 2.3.4
  if (input.length === 3) {
    verL = input[0];
    verR = input[2];
    if (input[1] === '-' && exp.test(verL) && exp.test(verR)) {
      // with Comparator
      if (/^[><]/.test(verL) || /^[><]/.test(verR)) {
        parsed = parseMinMax([verL, verR], exp);
        min = parsed.min;
        max = parsed.max;
      }
      // Handle ['2.3.4', '1.2.3'] case (verL > verR)
      else if (compareVersions(verL, verR) > 0) {
        min = verR;
        max = verL;
      }
      else {
        min = verL;
        max = verR;
      }
    }
    else {
      throw new Error(ERROR_MESSAGE);
    }
  }
  else {
    if (input.length === 2) {
      verL = input[0];
      verR = input[1];
      // Handle ['-', '1.2.3'] case
      if (verL === '-') {
        switch (verR) {
          case '*': // ['-', '*']
            return exceptionalInput(verR);
          case '-': // ['-', '-']
            throw new Error(ERROR_MESSAGE);
          default:
            if(!/^[><]/.test(verR)) {
              return { min: undefined, max: verR };
            }
            input = [verR];
        }
      }
      // Handle ['1.2.3', '-'] case
      if (verR === '-') {
        switch (verL) {
          case '*': // ['*', '-']
            return exceptionalInput(verL);
          case '-': // ['-', '-']
            throw new Error(ERROR_MESSAGE);
          default:
            if(!/^[><]/.test(verL)) {
              return { min: verL, max: undefined };
            }
            input = [verL];
        }
      }
      // Handle ['2.3.4', '1.2.3'] case (verL > verR)
      if (!/^[><]/.test(verL) && !/^[><]/.test(verR) &&
          compareVersions(verL, verR) > 0) {
        input = [verR, verL];
      }
    }
    parsed = parseMinMax(input, exp);
    min = parsed.min;
    max = parsed.max;
  }
  return { min: min, max: max };
};

/**
 * Takes a version string ('1.2.3') and returns a version string
 * that'll parse as one less than the input string ('1.2.3.-1').
 *
 * @param {String} vString
 * @return {String}
 */
function decrement (vString) {
  var match = (new RegExp('\\.?' + VERSION_PART_CAPTURE + '\\.?$')).exec(vString);
  var a = match[1];
  var b = match[2];
  var c = match[3];
  var d = match[4];
  var lastPos = vString.length - 1;
  var lastChar = vString.charAt(lastPos);

  // decrement '1.-1'
  if (a && /^-\d+$/.test(a) && !b) {
    lastPos -= (a.length + (lastChar === '.' ? 0 : -1));
    return vString.substr(0, lastPos) + ((a * 1 - 1) + '');
  }
  // decrement legacy '1.0+'
  if (a && b && /^\+$/.test(b) && !c && lastChar !== '.') {
    return vString.substr(0, lastPos);
  }
  // decrement '1.1a-1'
  if (b && /^.*-$/.test(b) && c && !d) {
    // pending
    // should it be treated as string-b === 'a-', number-c === '1',
    // or string-b === 'a', number-c === '-1'
  }
  return vString + (lastChar === '.' ? '' : '.') + '-1';
}
exports.decrement = decrement;

/**
 * Takes a version string ('1.2.3') and returns a version string
 * that'll parse as greater than the input string by the smallest margin
 * possible ('1.2.3.1').
 * listed as number-A, string-B, number-C, string-D in
 * Mozilla's Toolkit Format.
 * https://developer.mozilla.org/en-US/docs/Toolkit_version_format
 *
 * @param {String} vString
 * @return {String}
 */
function increment (vString) {
  var match = (new RegExp('\\.?' + VERSION_PART_CAPTURE + '\\.?$')).exec(vString);
  var a = match[1];
  var b = match[2];
  var c = match[3];
  var d = match[4];
  var lastPos = vString.length - 1;
  var lastChar = vString.charAt(lastPos);

  // increment '1.-1'
  if (a && /^-\d+$/.test(a) && !b) {
    lastPos -= (a.length + (lastChar === '.' ? 0 : -1));
    return vString.substr(0, lastPos) + ((a * 1 + 1) + '');
  }
  if (!b) {
    return vString + (lastChar === '.' ? '' : '.') + '1';
  }
  // increment legacy '1.0+'
  if (/^\+$/.test(b) && !c && lastChar !== '.') {
    lastPos -= a.length;
    return vString.substr(0, lastPos) + ((a * 1 + 1) + 'pre');
  }
  if (!c) {
    return vString + (lastChar === '*' ? '.' : '') + '1';
  }
  // increment '1.1a-1'
  if (/^.*-$/.test(b) && !d) {
    // pending
    // should it be treated as string-b === 'a-', number-c === '1',
    // or string-b === 'a', number-c === '-1'
  }
  if (!d) {
    return vString.substr(0, lastPos) + (++lastChar);
  }
  return vString.substr(0, lastPos) + String.fromCharCode(lastChar.charCodeAt(0) + 1);
}
exports.increment = increment;

/**
 * Takes an array containing 1 or 2 version strings (['>=1,2,3', '<=2.3.4']).
 * Parse each string and set min/max version from comparator.
 *
 * @param {Array} input
 * @param {RegExp} exp - RegExp('^' + VERSION_STRING + '$')
 * @return {Object}
 */
function parseMinMax (input, exp) {
  var min, max, str, cmp, ver, pre;
  for (var i = 0, l = input.length; i < l; i++) {
    str = exp.exec(input[i]);
    if (str) {
      cmp = str[1];
      ver = str[2];
      pre = /^((?:\d+\.)*)(\d+)\+$/.exec(ver);
      if ((!cmp || /^[><]=$/.test(cmp)) && pre) {
        ver = pre[1] + (pre[2] * 1 + 1) + 'pre';
      }
      switch (cmp) {
        case '>':
          ver = increment(ver);
          if (!min || compareVersions(min, ver) > 0) {
            min = ver;
          }
          break;
        case '>=':
          if (!min || compareVersions(min, ver) > 0) {
            min = ver;
          }
          break;
        case '<':
          ver = decrement(ver);
          if (!max || compareVersions(ver, max) > 0) {
            max = ver;
          }
          break;
        case '<=':
          if (!max || compareVersions(ver, max) > 0) {
            max = ver;
          }
          break;
        default:
          // !COMPARATOR
          if (ver === '*') {
            max = ver;
          }
          else if (i === 0) {
            min = max = ver;
          }
          else if (!max || compareVersions(ver, max) > 0) {
            max = ver;
          }
      }
    }
    else {
      throw new Error(ERROR_MESSAGE);
    }
  }
  if (min && max && compareVersions(min, max) > 0) {
    throw new Error(ERROR_MESSAGE);
  }
  return { min: min, max: max };
}

/**
 * Handle exceptional input cases ('*', '-', '')
 *
 * @param {string} str
 * @return {Object}
 */
function exceptionalInput(str) {
  return { min: undefined, max: str === '*' ? '*' : undefined };
}
