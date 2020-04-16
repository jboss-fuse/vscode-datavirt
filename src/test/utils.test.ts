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
import { DataVirtConfig } from '../model/DataVirtModel';

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
	});
});
