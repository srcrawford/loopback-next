const prettier = require('prettier');
const defaultOptions = require('rc')('prettier');

delete defaultOptions._;
delete defaultOptions.configs;
delete defaultOptions.config;

module.exports = function(code, options) {
  options = Object.assign(defaultOptions, options);
  return prettier.format(code, {parser: 'typescript', ...options});
};
