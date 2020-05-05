/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs';
import * as path from 'path';
import * as constants from '../constants';
import * as utils from '../utils';
import { DataVirtConfig, ConfigMapRef, KeyRef, SecretRef, DataSourceConfig } from '../model/DataVirtModel';

chai.use(sinonChai);
const should = chai.should();

describe('Utils', () => {

	context('Validate the length and content of an OS resource name', () => {
		it('should return a validation error message when handing over an undefined parameter', () => {
			should.exist(utils.validateName(undefined));
		});

		it('should return a validation error message when handing over a name with less than 4 characters', () => {
			should.exist(utils.validateName('xyz'));
		});

		it('should return a validation error message when handing over a name with more than 253 characters', () => {
			should.exist(utils.validateName('12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234'));
		});

		it('should return undefined (no error) when handing over a name length between 4 and 253 characters', () => {
			should.not.exist(utils.validateName('test'));
		});

		it('should return a validation error when using special chars in the name', () => {
			should.exist(utils.validateName('_myTest'));
			should.exist(utils.validateName('test-1'));
			should.exist(utils.validateName('myTest$1'));
			should.exist(utils.validateName('test#1'));
			should.exist(utils.validateName('my.Test'));
			should.exist(utils.validateName('test/1'));
		});
	});

	context('Replace the name of a template', () => {

		it('should replace the name inside VDB DDL template with the given name', () => {
			const newName: string = 'newname';
			const ddl_old: string = `CREATE DATABASE $!VDB_NAME_PLACEHOLDER!$ OPTIONS (ANNOTATION 'provide your description here..');
			USE DATABASE $!VDB_NAME_PLACEHOLDER!$;

			CREATE VIRTUAL SCHEMA $!VDB_NAME_PLACEHOLDER!$;
			SET SCHEMA $!VDB_NAME_PLACEHOLDER!$;

			CREATE VIEW SAMPLE AS SELECT 1 as valid;`;
			const ddl_new: string = `CREATE DATABASE newname OPTIONS (ANNOTATION 'provide your description here..');
			USE DATABASE newname;

			CREATE VIRTUAL SCHEMA newname;
			SET SCHEMA newname;

			CREATE VIEW SAMPLE AS SELECT 1 as valid;`;
			const result: string = utils.replaceDDLNamePlaceholder(ddl_old, constants.DDL_NAME_PLACEHOLDER, newName);
			should.equal(result, ddl_new, 'Replacing of the DDL name placeholder failed.');
		});

		it('should return undefined when calling replaceDDLNamePlaceholder with undefined ddl parameter', () => {
			const result: string = utils.replaceDDLNamePlaceholder(undefined, constants.DDL_NAME_PLACEHOLDER, 'newname');
			should.not.exist(result);
		});

		it('should return undefined when calling replaceDDLNamePlaceholder with undefined placeholder parameter', () => {
			const result: string = utils.replaceDDLNamePlaceholder('teststring', undefined, 'newname');
			should.not.exist(result);
		});

		it('should return undefined when calling replaceDDLNamePlaceholder with undefined replacement parameter', () => {
			const result: string = utils.replaceDDLNamePlaceholder('teststring', constants.DDL_NAME_PLACEHOLDER, undefined);
			should.not.exist(result);
		});
	});

	context('Load/Save of a VDB file', () => {
		it('should match the vdb model contents between a save and reload to/from a vdb file', () => {
			const name: string = 'test';
			const fpOrig: string = path.resolve(__dirname, '../../testFixture', `${name}.yaml`);
			const fpTest: string = path.resolve(__dirname, '../../testFixture', `${name}2.yaml`);
			const yamlDoc:DataVirtConfig = utils.loadModelFromFile(fpOrig);
			should.exist(yamlDoc);
			utils.saveModelToFile(yamlDoc, fpTest);
			should.exist(utils.validateFileNotExisting(name));
			const yamlDoc2:DataVirtConfig = utils.loadModelFromFile(fpTest);
			should.exist(yamlDoc2);
			yamlDoc.should.deep.equal(yamlDoc2);
			fs.unlinkSync(fpTest);
		});

		it('should return undefined for yaml files which are not kind VirtualDatabase', () => {
			const fpTest: string = path.resolve(__dirname, '../../testFixture', `dummy.yaml`);
			fs.writeFileSync(fpTest, 'test');
			const yamlDoc:DataVirtConfig = utils.loadModelFromFile(fpTest);
			should.not.exist(yamlDoc);
			fs.unlinkSync(fpTest);
		});
	});

	context('Type Guards', () => {
		it('should return true if trying to check for isSecretRef with a SecretRef parameter', () => {
			should.equal(true, utils.isSecretRef(new SecretRef(new KeyRef('name', 'key'))));
		});

		it('should return false if trying to check for isSecretRef with a ConfigMapRef parameter', () => {
			should.not.equal(true, utils.isSecretRef(new ConfigMapRef(new KeyRef('name', 'key'))));
		});

		it('should return false if trying to check for isSecretRef with an undefined parameter', () => {
			should.not.equal(true, utils.isSecretRef(undefined));
		});

		it('should return true if trying to check for isConfigMapRef with a ConfigMapRef parameter', () => {
			should.equal(true, utils.isConfigMapRef(new ConfigMapRef(new KeyRef('name', 'key'))));
		});

		it('should return false if trying to check for isConfigMapRef with a SecretRef parameter', () => {
			should.not.equal(true, utils.isConfigMapRef(new SecretRef(new KeyRef('name', 'key'))));
		});

		it('should return false if trying to check for isConfigMapRef with an undefined parameter', () => {
			should.not.equal(true, utils.isConfigMapRef(undefined));
		});
	});

	context('checkForValue', () => {
		it('should not return a missing property name if value is not undefined or empty', () => {
			const newText: string = utils.checkForValue(new KeyRef('name', 'key'), 'MyValue', '');
			newText.should.equal('');
		});

		it('should return the missing property name MyValue if value is undefined', () => {
			const newText: string = utils.checkForValue(undefined, 'MyValue', '');
			newText.should.equal('MyValue');
		});

		it('should return the missing property in addition to existing ones if value is undefined', () => {
			const newText: string = utils.checkForValue(undefined, 'MyValue', 'MyOtherValue');
			newText.should.equal('MyOtherValue, MyValue');
		});
	});

	context('DataSource/-Entry Utils', () => {

		let yamlDoc: DataVirtConfig;

		beforeEach( () => {
			const name: string = 'test';
			const fpOrig: string = path.resolve(__dirname, '../../testFixture', `${name}.yaml`);
			yamlDoc = utils.loadModelFromFile(fpOrig);
			should.exist(yamlDoc);
		});

		it('should return a datasource when the given name can be found', () => {
			should.exist(utils.getDataSourceByName(yamlDoc, 'mariadb'));
		});

		it('should return undefined when no datasource with the given name can be found', () => {
			should.not.exist(utils.getDataSourceByName(yamlDoc, 'not-existing-datasource'));
		});

		it('should return undefined when trying to get the datasource with an undefined name', () => {
			should.not.exist(utils.getDataSourceByName(yamlDoc, undefined));
		});

		it('should return undefined when model has no datasources', () => {
			yamlDoc.spec.datasources = undefined;
			should.not.exist(utils.getDataSourceByName(yamlDoc, 'mariadb'));
		});

		it('should return undefined when model has no spec', () => {
			yamlDoc.spec = undefined;
			should.not.exist(utils.getDataSourceByName(yamlDoc, 'mariadb'));
		});

		it('should return undefined when model is undefined', () => {
			yamlDoc = undefined;
			should.not.exist(utils.getDataSourceByName(yamlDoc, 'mariadb'));
		});

		it('should return a datasource entry when the given name can be found', () => {
			const dataSourceConfig: DataSourceConfig = utils.getDataSourceByName(yamlDoc, 'mariadb');
			should.exist(dataSourceConfig);
			should.exist(utils.getDataSourceEntryByName('email', dataSourceConfig));
			should.exist(utils.getDataSourceEntryByName('user', dataSourceConfig));
		});

		it('should return undefined when no datasource entry with the given name can be found', () => {
			const dataSourceConfig: DataSourceConfig = utils.getDataSourceByName(yamlDoc, 'mariadb');
			should.exist(dataSourceConfig);
			should.not.exist(utils.getDataSourceEntryByName('not-existing', dataSourceConfig));
		});

		it('should return undefined when trying to get the datasource entry with an undefined name', () => {
			const dataSourceConfig: DataSourceConfig = utils.getDataSourceByName(yamlDoc, 'mariadb');
			should.exist(dataSourceConfig);
			should.not.exist(utils.getDataSourceEntryByName('not-existing', undefined));
		});

		it('should return undefined when datasource has no properties', () => {
			const dataSourceConfig: DataSourceConfig = utils.getDataSourceByName(yamlDoc, 'mariadb');
			should.exist(dataSourceConfig);
			dataSourceConfig.properties = undefined;
			should.not.exist(utils.getDataSourceEntryByName('not-existing', dataSourceConfig));
		});

		it('should return undefined when datasource is undefined', () => {
			should.not.exist(utils.getDataSourceEntryByName('not-existing', undefined));
		});
	});

	context('DataSource Entry Label Creation', () => {
		it('should return the name of a non-reference as label with valid parameters', () => {
			should.equal('myValue', utils.generateReferenceValueForLabel('myValue', undefined));
		});

		it('should return undefined for a non-reference with undefined value parameter', () => {
			should.equal(undefined, utils.generateReferenceValueForLabel(undefined, undefined));
		});

		it('should return the key @ name for a secrets reference as label with valid parameters', () => {
			should.equal('key @ name', utils.generateReferenceValueForLabel(undefined, new SecretRef(new KeyRef('name', 'key'))));
		});

		it('should return the key @ name for a configmap reference as label with valid parameters', () => {
			should.equal('key @ name', utils.generateReferenceValueForLabel(undefined, new ConfigMapRef(new KeyRef('name', 'key'))));
		});
	});
});
