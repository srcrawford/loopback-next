// This is an auto-generated file -- DO NOT EDIT

import {DataSourceConstructor} from '@loopback/repository';
const dsConfig = require('./db.datasource.json');

export class DbDataSourceBase extends DataSourceConstructor {
  constructor(config = {}) {
    config = Object.assign(dsConfig, config);
    super(config);
  }
}
