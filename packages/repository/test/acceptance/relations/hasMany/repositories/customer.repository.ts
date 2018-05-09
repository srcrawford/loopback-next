// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: @loopback/repository
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  DefaultCrudRepository,
  DataSourceType,
  ModelMetadataHelper,
  RelationMetadata,
  RepositoryMetadata,
} from '../../../../../';
import {Customer} from '../models/customer.model';
import {Order} from '../models/order.model';
import {inject, Context} from '@loopback/core';
import {OrderRepository} from './order.repository';

export class CustomerRepository extends DefaultCrudRepository<
  Customer,
  typeof Customer.prototype.id
> {
  constructor(protected datasource: DataSourceType) {
    super(Customer, datasource);
  }
}
