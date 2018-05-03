// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/cli
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const ArtifactGenerator = require('../../lib/artifact-generator');
const debug = require('../../lib/debug')('datasource-generator');
const path = require('path');
const utils = require('../../lib/utils');
const connectors = require('./connectors.json');

module.exports = class DataSourceGenerator extends ArtifactGenerator {
  constructor(args, opts) {
    super(args, opts);
    this.connectorChoices = [];
  }

  _setupGenerator() {
    this.artifactInfo = {
      type: 'datasource',
      rootDir: 'src',
    };

    this.artifactInfo.outdir = path.resolve(
      this.artifactInfo.rootDir,
      'datasources'
    );

    this.option('datasourceType', {
      type: String,
      required: false,
      description: 'Type for the ' + this.artifactInfo.type,
    });

    // Creating an array of connector choices
    Object.entries(connectors).forEach(([key, value]) => {
      const support = value.supportedByStrongLoop
        ? '(supported by StrongLoop)'
        : '(provided by community)';
      this.connectorChoices.push({
        name: `${connector.description} ${support}`,
        value: connector.name,
      });
    });
    this.connectorChoices.push('other');

    return super._setupGenerator();
  }

  checkLoopBackProject() {
    return super.checkLoopBackProject();
  }

  promptArtifactName() {
    debug('Prompting for artifact name');
    if (this.shouldExit()) return false;
    const prompts = [
      {
        type: 'input',
        name: 'name',
        // capitalization
        message: utils.toClassName(this.artifactInfo.type) + ' name:',
        when: this.artifactInfo.name === undefined,
        validate: utils.validateClassName,
      },
    ];

    return this.prompt(prompts).then(props => {
      Object.assign(this.artifactInfo, props);
      return props;
    });
  }

  promptDataSourceType() {
    debug('Prompting for datasource type');
    return this.prompt();
  }
};
