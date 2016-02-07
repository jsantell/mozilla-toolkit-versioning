/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

exports.parse = function (input) {
  var ERROR_MESSAGE = '`parse` argument must be a populated string.';

  // Expression to match Mozilla's Toolkit Format.
  // https://developer.mozilla.org/en-US/docs/Toolkit_version_format
  var VERSION_PART = '(?:(?:-?[\\d]+)?(?:[!-\\-\\/:-~]+)?){2}';
  var VERSION_FORMAT = '(?:' + VERSION_PART + ')?(?:\.(?:' + VERSION_PART + ')?)*';
  var COMPARATOR = '[><]=?';
  var VERSION_STRING = '(' + COMPARATOR + ')?(' + VERSION_FORMAT + ')';

  input = input || '';
  input = input.trim();

  var inputs = input.split(/\s+/);

  if (!input ||
      !(new RegExp(VERSION_STRING)).test(input) ||
      inputs.length < 1 ||
      inputs.length > 3) {
    throw new Error(ERROR_MESSAGE);
  }

  // Handle the '*' case
  // note: Maybe return { min: undefined, max: '*' } should be better?
  if (input === '*') {
    return { min: undefined, max: undefined };
  }

  var min, max;

  // 1.2.3 - 2.3.4
  if (inputs.length === 3) {
    // note: If '>=1.2.3 - <=2.3.4' is acceptable (with COMPARATOR),
    // then expression for version string should be
    // new RegExp(`${VERSION_STRING}`)
    var exp = new RegExp('^' + VERSION_FORMAT + '$');
    if (inputs[1] === '-' && exp.test(inputs[0]) && exp.test(inputs[2])) {
      return { min: inputs[0], max: inputs[2] };
    }
    else {
      throw new Error(ERROR_MESSAGE);
    }
  }
  else {
    // inputs.length will be 1 or 2
    for (var exp = new RegExp('^' + VERSION_STRING + '$'),
             i = 0, l = inputs.length; i < l; i++) {
      var str = exp.exec(inputs[i]);
      if (str) {
        switch (str[1]) {
          case '>':
            min = increment(str[2]);
            break;
          case '>=':
            min = str[2];
            break;
          case '<':
            max = decrement(str[2]);
            break;
          case '<=':
            max = str[2];
            break;
          default:
            // !COMPARATOR
            if (i === 0) {
              min = max = str[2];
              if (l === 1) {
                break;
              }
            }
            else {
              max = str[2];
            }
        }
      }
      else {
        throw new Error(ERROR_MESSAGE);
      }
    }
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
  return vString + (vString.charAt(vString.length - 1) === '.' ? '' : '.') + '-1';
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
  var VERSION_PART_CAPTURE = '(-?[\\d]+)?([!-\\-\\/:-~]+)?(-?[\\d]+)?([!-\\-\\/:-~]+)?';
  var match = (new RegExp('\\.?' + VERSION_PART_CAPTURE + '\\.?$')).exec(vString);
  var a = match[1];
  var b = match[2];
  var c = match[3];
  var d = match[4];
  var lastPos = vString.length - 1;
  var lastChar = vString.charAt(lastPos);

  if (!b) {
    return vString + (lastChar === '.' ? '' : '.') + '1';
  }
  if (!c) {
    return vString + (lastChar === '*' ? '.' : '') + '1';
  }
  if (!d) {
    return vString.substr(0, lastPos) + (++lastChar);
  }
  return vString.substr(0, lastPos) + String.fromCharCode(lastChar.charCodeAt(0) + 1);
}
exports.increment = increment;
