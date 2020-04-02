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
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as extension from '../extension';
import * as utils from '../utils';
import * as createVDBCommand from '../commands/CreateVDBCommand';
import * as createDSCommand from '../commands/CreateDataSourceCommand';
import * as createDSEntryCommand from '../commands/CreateDataSourceEntryCommand';
import * as deleteDSEntryCommand from '../commands/DeleteDataSourceEntryCommand';
import * as editDSEntryCommand from '../commands/EditDataSourceEntryCommand';
import * as mongoDBDS from '../model/datasources/MongoDBDataSource';
import { IDVConfig, IDataSourceConfig, IEnv } from '../model/DataVirtModel';

chai.use(sinonChai);
const should = chai.should();

describe('Commands Tests', () => {
	const name = 'newvdb';
	const dsName: string = 'MyMongoDB';
	const dsType: string = 'MongoDB';
	const prefix: string = 'SPRING_TEIID_DATA_MONGODB_MYMONGODB';
	const mongoTempl: mongoDBDS.MongoDBDataSource = new mongoDBDS.MongoDBDataSource(dsName);
	const mongoDSType: string = mongoTempl.type;
	const entryName: string = 'NEWKEY';
	const entryValue: string = 'NEWVALUE';

	let vdbFile: string;
	let workspacePath: string;
	let templateFolder: string;

	let dvConfig: IDVConfig;
	let dsConfig: IDataSourceConfig;

	function cleanupVDB(): void {
		if (vdbFile && fs.existsSync(vdbFile)) {
			fs.unlinkSync(vdbFile);
		}
	}

	function prepareDataSource(dvConfig: IDVConfig, dataSourceName: string, dataSourceType: string): IDataSourceConfig {
		let datasourceConfig = {
			name: dataSourceName,
			type: dataSourceType,
			entries: new Map()
		};
		dvConfig.spec.env.forEach( (element: IEnv) => {
			const key: string = element.name.slice(prefix.length+1);
			datasourceConfig.entries.set(key, element.value);
		});
		return datasourceConfig;
	}

	async function initializeGlobals(createTestDataSourceEntry: boolean) {
		const createdVDB = await createVDBCommand.handleVDBCreation(workspacePath, name, templateFolder);
		should.equal(true, createdVDB, 'Execution of the command Create VDB returned false');

		vdbFile = path.join(workspacePath, `${name}.yaml`);
		fs.existsSync(vdbFile).should.equal(true);
		dvConfig = utils.loadModelFromFile(vdbFile);

		const createdDS = await createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, vdbFile);
		should.equal(true, createdDS, 'Execution of the Create DataSource command returned false');

		const dvConfig2: IDVConfig = utils.loadModelFromFile(vdbFile);
		dvConfig2.should.deep.equal(dvConfig);
		dvConfig2.spec.env.length.should.deep.equal(mongoTempl.entries.size);

		dvConfig = utils.loadModelFromFile(vdbFile);
		dsConfig = prepareDataSource(dvConfig, dsName, mongoDSType);

		if (createTestDataSourceEntry === true) {
			const oldLen: number = dvConfig.spec.env.length;

			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, entryName, entryValue);
			should.equal(true, created, 'Execution of the Create DataSource Entry command returned false');

			dvConfig.spec.env.length.should.equal(oldLen+1);
			should.exist(dvConfig.spec.env.find( (element) => {
				return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, entryName) && element.value === entryValue;
			}));
			dvConfig = utils.loadModelFromFile(vdbFile);
			dsConfig = prepareDataSource(dvConfig, dsName, mongoDSType);
		}
	}

	async function createDataSourceEntryWithValidParameters(dvConfig: IDVConfig, dsConfig: IDataSourceConfig, vdbFile: string, entryName: string, entryValue: string) {
		const oldLen: number = dvConfig.spec.env.length;
		const success = await editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, vdbFile, entryName, entryValue);
		should.equal(true, success, 'Execution of the Edit DataSource command returned false');
		dvConfig.spec.env.length.should.equal(oldLen);
		should.exist(dvConfig.spec.env.find( (element) => {
			return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, entryName) && element.value === entryValue;
		}));
	}

	before(() => {
		extension.fillDataTypes();
		workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		should.exist(workspacePath);
		workspacePath.should.contain('testFixture');
		templateFolder = path.join(workspacePath, '../resources/');
	});

	context('Create DataSource Entry', () => {

		beforeEach( async () => {
			await initializeGlobals(false);
		});

		it('should create a datasource entry inside a datasource when handing over valid parameters', async () => {
			const oldLen: number = dvConfig.spec.env.length;
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, entryName, entryValue);
			should.equal(true, created, 'Execution of the Create DataSource Entry command returned false');

			dvConfig.spec.env.length.should.equal(oldLen+1);
			should.exist(dvConfig.spec.env.find( (element) => {
				return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, entryName) && element.value === entryValue;
			}));
		});

		it('should not create a datasource entry inside a datasource when handing over invalid model', async () => {
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(undefined, dsConfig, vdbFile, entryName, entryValue);
			should.equal(false, created, 'Execution of the Create DataSource Entry command returned true, but should not.');
		});

		it('should not create a datasource entry inside a datasource when handing over invalid datasource config', async () => {
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, undefined, vdbFile, entryName, entryValue);
			should.equal(false, created, 'Execution of the Create DataSource Entry command returned true, but should not.');
		});

		it('should not create a datasource entry inside a datasource when handing over invalid file', async () => {
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, undefined, entryName, entryValue);
			should.equal(false, created, 'Execution of the Create DataSource Entry command returned true, but should not.');
		});

		it('should not create a datasource entry inside a datasource when handing over invalid entry key', async () => {
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, undefined, entryValue);
			should.equal(false, created, 'Execution of the Create DataSource Entry command returned true, but should not.');
		});

		it('should not create a datasource entry inside a datasource when handing over invalid entry value', async () => {
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, entryName, undefined);
			should.equal(false, created, 'Execution of the Create DataSource Entry command returned true, but should not.');
		});
	});

	context('Modify DataSource Entry', () => {

		beforeEach( async () => {
			await initializeGlobals(true);
		});

		afterEach( () => {
			cleanupVDB();
		});

		it('should return true when modifying a datasource entry with valid parameters', async () => {
			await createDataSourceEntryWithValidParameters(dvConfig, dsConfig, vdbFile, entryName, 'XYZVALUE');
		});

		it('should return true when changing a datasource entry value to an empty string', async () => {
			await createDataSourceEntryWithValidParameters(dvConfig, dsConfig, vdbFile, entryName, '');
		});

		it('should return false when changing a datasource entry with an invalid model', async () => {
			const success = await editDSEntryCommand.handleDataSourceEntryEdit(undefined, dsConfig, vdbFile, entryName, entryValue);
			should.equal(false, success, 'Execution of the Edit DataSource command returned true, but should not');
		});

		it('should return false when changing a datasource entry with an invalid datasource config', async () => {
			const success = await editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, undefined, vdbFile, entryName, entryValue);
			should.equal(false, success, 'Execution of the Edit DataSource command returned true, but should not');
		});

		it('should return false when changing a datasource entry with an file', async () => {
			const success = await editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, undefined, entryName, entryValue);
			should.equal(false, success, 'Execution of the Edit DataSource command returned true, but should not');
		});

		it('should return false when changing a datasource entry with an invalid key', async () => {
			const success = await editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, vdbFile, undefined, entryValue);
			should.equal(false, success, 'Execution of the Edit DataSource command returned true, but should not');
		});

		it('should return false when changing a datasource entry with a not existing key', async () => {
			const success = await editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, vdbFile, 'NOT_EXISTING', entryValue);
			should.equal(false, success, 'Execution of the Edit DataSource command returned true, but should not');
		});

		it('should return false when changing a datasource entry with an invalid value', async () => {
			const success = await editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, vdbFile, entryName, undefined);
			should.equal(false, success, 'Execution of the Edit DataSource command returned true, but should not');
		});
	});

	context('Delete DataSource Entry', () => {

		beforeEach( async () => {
			await initializeGlobals(true);
		});

		afterEach( () => {
			cleanupVDB();
		});

		it('should return true when modifying a datasource entry with valid parameters', async () => {
			const oldLen: number = dvConfig.spec.env.length;
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, vdbFile, entryName);
			should.equal(true, success, 'Execution of the Edit DataSource command returned false');

			dvConfig.spec.env.length.should.equal(oldLen-1);
			should.not.exist(dvConfig.spec.env.find( (element) => {
				return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, entryName);
			}));
		});

		it('should return false when deleting a datasource entry with invalid model', async () => {
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(undefined, dsConfig, vdbFile, entryName);
			should.equal(false, success, 'Execution of the Edit DataSource command returned true, but it should not');
		});

		it('should return false when deleting a datasource entry with invalid datasource config', async () => {
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, undefined, vdbFile, entryName);
			should.equal(false, success, 'Execution of the Edit DataSource command returned true, but it should not');
		});

		it('should return false when deleting a datasource entry with invalid file', async () => {
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, undefined, entryName);
			should.equal(false, success, 'Execution of the Edit DataSource command returned true, but it should not');
		});

		it('should return false when deleting a datasource entry with invalid key', async () => {
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, vdbFile, undefined);
			should.equal(false, success, 'Execution of the Edit DataSource command returned true, but it should not');
		});

		it('should return false when deleting a datasource entry with not existing key', async () => {
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, vdbFile, 'NOT_EXISTING');
			should.equal(false, success, 'Execution of the Edit DataSource command returned true, but it should not');
		});
	});
});
