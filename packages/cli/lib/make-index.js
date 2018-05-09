const glob = require('glob');
const path = require('path');
const format = require('./format');
const fs = require('fs-extra');
const debug = require('./debug')('make-index');

/**
 *
 * @param {string} dir
 * @param {object} options
 * options.nested: boolean = true
 * options.prefix: string | string[] = ''
 * options.commentHeader:string = SEE BELOW
 */
module.exports = function(dir, options = {}) {
  const EXTENSION = '.ts';

  const defaultOptions = {
    nested: true,
    prefix: '',
    commentHeader: `This is an auto-generated file. DO NOT EDIT.`,
  };
  options = Object.assign(defaultOptions, options);

  options.prefix = Array.isArray(options.prefix)
    ? `@(${options.prefix.join('|')})`
    : options.prefix;

  const globPattern = `*${options.prefix}${EXTENSION}`;

  debug(`dir: ${dir}`);
  debug(`options: ${JSON.stringify(options)}`);
  debug(`globPattern: ${globPattern}`);

  const globOptions = {root: dir, matchBase: options.nested};

  glob(globPattern, globOptions, function(err, files) {
    if (err) return;

    const outLines = [];
    if (options.commentHeader.length > 0) {
      const comments = options.commentHeader.split('\n');
      options.commentHeader = '';
      comments.forEach(comment => {
        options.commentHeader += `// ${comment}\n`;
      });

      outLines.push(options.commentHeader);
    }

    files.forEach(file => {
      const relPath = `export * from './${path
        .relative(dir, file)
        .slice(0, -3)}';`;
      outLines.push(relPath);
    });

    const lines = outLines.join('\n');
    const code = format(lines);

    debug('code =>');
    debug(code);

    const outFile = `${dir}/index.ts`;
    debug(`outFile => ${outFile}`);

    fs.outputFileSync(outFile, code);
  });
};
