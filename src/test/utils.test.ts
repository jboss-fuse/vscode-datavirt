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
import * as extension from '../extension';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs';
import * as path from 'path';
import * as utils from '../utils';
import { IDataSourceConfig, IDVConfig, IEnv } from '../model/DataVirtModel';

chai.use(sinonChai);
const should = chai.should();

describe('Utils', () => {
	context('DataSource Handling', () => {
		it('should generate a valid prefix for a datasource config', () => {
			const dsConfig: IDataSourceConfig = {
				name: 'example',
				type: 'fuse',
				entries: new Map()
			};
			const prefix:string = utils.generateDataSourceConfigPrefix(dsConfig);
			prefix.should.deep.equal(`${dsConfig.type}_${dsConfig.name}`);
		});

		it('should return undefined on a null datasource config when trying to obtain the datasource config prefix', () => {
			should.not.exist(utils.generateDataSourceConfigPrefix(undefined));
		});

		it('should return undefined on a datasource config with no name when trying to obtain the datasource config prefix', () => {
			const dsConfig: IDataSourceConfig = {
				name: undefined,
				type: 'fuse',
				entries: new Map()
			};
			should.not.exist(utils.generateDataSourceConfigPrefix(dsConfig));
		});

		it('should return undefined on a datasource config with no type when trying to obtain the datasource config prefix', () => {
			const dsConfig: IDataSourceConfig = {
				name: 'example',
				type: undefined,
				entries: new Map()
			};
			should.not.exist(utils.generateDataSourceConfigPrefix(dsConfig));
		});

		it('should generate a valid datasource config entry key when using a valid datasource configuration', () => {
			const dsConfig: IDataSourceConfig = {
				name: 'example',
				type: 'fuse',
				entries: new Map()
			};
			const dsName: string = 'myKey';
			const key:string = utils.generateFullDataSourceConfigEntryKey(dsConfig, dsName);
			key.should.deep.equal(`${dsConfig.type}_${dsConfig.name}_${dsName}`);
		});
	});

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
		it('should replace the name of a datasource template with the given name', () => {
			const newName: string = 'NEWNAME';
			extension.fillDataTypes();
			let dsConfig: IDataSourceConfig = extension.DATASOURCE_TYPES.get('SpringBoot');
			should.exist(dsConfig);
			dsConfig = utils.replaceTemplateName(dsConfig, newName, extension.TEMPLATE_NAME);
			dsConfig.type.should.deep.equal('SPRING_DATASOURCE');
			dsConfig.name.should.deep.equal(newName);
		});

		it('should return undefined if handing over an undefined datasource config parameter', () => {
			const newName: string = 'NEWNAME';
			extension.fillDataTypes();
			let dsConfig: IDataSourceConfig;
			should.not.exist(dsConfig);
			dsConfig = utils.replaceTemplateName(dsConfig, newName, extension.TEMPLATE_NAME);
			should.not.exist(dsConfig);
		});

		it('should return undefined if handing over an undefined name parameter', () => {
			const newName: string = undefined;
			extension.fillDataTypes();
			let dsConfig: IDataSourceConfig = extension.DATASOURCE_TYPES.get('SpringBoot');
			should.exist(dsConfig);
			dsConfig = utils.replaceTemplateName(dsConfig, newName, extension.TEMPLATE_NAME);
			should.not.exist(dsConfig);
		});

		it('should return undefined if handing over an undefined template name placeholder parameter', () => {
			const newName: string = 'NEWNAME';
			extension.fillDataTypes();
			let dsConfig: IDataSourceConfig = extension.DATASOURCE_TYPES.get('SpringBoot');
			should.exist(dsConfig);
			dsConfig = utils.replaceTemplateName(dsConfig, newName, undefined);
			should.not.exist(dsConfig);
		});
	});

	/**
	 * disabled because broken probably due to incorrect path for testFixture folder
	 */
	// context('Load/Save of a VDB file', () => {
	// 	it('should match the vdb model contents between a save and reload to/from a vdb file', () => {
	// 		const name: string = 'test';
	// 		const fpOrig: string = path.resolve(__dirname, '../../testFixture', `${name}.yaml`);
	// 		const fpTest: string = path.resolve(__dirname, '../../testFixture', `${name}2.yaml`);
	// 		const yamlDoc:IDVConfig = utils.loadModelFromFile(fpOrig);
	// 		should.exist(yamlDoc);
	// 		utils.saveModelToFile(yamlDoc, fpTest);
	// 		should.exist(utils.validateFileNotExisting(name));
	// 		const yamlDoc2:IDVConfig = utils.loadModelFromFile(fpTest);
	// 		should.exist(yamlDoc2);
	// 		yamlDoc.api_version.should.deep.equal(yamlDoc2.api_version);
	// 		yamlDoc.kind.should.deep.equal(yamlDoc2.kind);
	// 		yamlDoc.metadata.name.should.deep.equal(yamlDoc2.metadata.name);
	// 		yamlDoc.spec.env.length.should.deep.equal(yamlDoc2.spec.env.length);
	// 		should.exist(yamlDoc2.spec.build.source.ddl);
	// 		fs.unlinkSync(fpTest);
	// 	});
	// });
});
