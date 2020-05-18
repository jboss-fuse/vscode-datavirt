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
import * as fs from 'fs';
import * as path from 'path';
import * as sinonChai from 'sinon-chai';
import * as vscode from 'vscode';

import * as constants from '../constants';
import * as createVDBCommand from '../commands/CreateVDBCommand';
import * as createDSCommand from '../commands/CreateDataSourceCommand';
import * as createDSEntryCommand from '../commands/CreateDataSourceEntryCommand';
import { DataVirtConfig, DataSourceConfig, Property, SecretRef } from '../model/DataVirtModel';
import * as deleteDSEntryCommand from '../commands/DeleteDataSourceEntryCommand';
import * as editDSEntryCommand from '../commands/EditDataSourceEntryCommand';
import * as extension from '../extension';
import * as mongoDBDS from '../model/datasources/MongoDBDataSource';
import * as utils from '../utils';

chai.use(sinonChai);
const should = chai.should();

describe('Commands Tests', () => {
	const name = 'newvdb';
	const dsName: string = 'MyMongoDB';
	const dsType: string = 'MongoDB';
	const mongoTempl: mongoDBDS.MongoDBDataSource = new mongoDBDS.MongoDBDataSource(dsName);
	const entryName: string = 'newkey';
	const entryValue: string = 'newvalue';

	let vdbFile: string;
	let workspacePath: string;
	let templateFolder: string;

	let dvConfig: DataVirtConfig;
	let dsConfig: DataSourceConfig;

	function cleanupVDB(): void {
		if (vdbFile && fs.existsSync(vdbFile)) {
			fs.unlinkSync(vdbFile);
		}
	}

	async function initializeGlobals(createTestDataSourceEntry: boolean) {
		const createdVDB = await createVDBCommand.handleVDBCreation(workspacePath, name, templateFolder);
		should.equal(true, createdVDB, 'Execution of the command Create VDB returned false');

		vdbFile = path.join(workspacePath, `${name}.yaml`);
		fs.existsSync(vdbFile).should.equal(true);
		dvConfig = await utils.loadModelFromFile(vdbFile);

		const createdDS = await createDSCommand.createDataSource(dsName, dsType, dvConfig, vdbFile);
		should.equal(true, createdDS, 'Execution of the Create DataSource command returned false');

		const dvConfig2: DataVirtConfig = await utils.loadModelFromFile(vdbFile);
		dvConfig2.should.deep.equal(dvConfig);
		dvConfig2.spec.datasources[0].properties.length.should.deep.equal(mongoTempl.properties.length);

		dvConfig = await utils.loadModelFromFile(vdbFile);
		dsConfig = utils.getDataSourceByName(dvConfig, dsName);

		if (createTestDataSourceEntry === true) {
			const oldLen: number = dvConfig.spec.datasources[0].properties.length;
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, constants.REFERENCE_TYPE_VALUE, entryName, entryValue);
			should.equal(true, created, 'Execution of the Create DataSource Entry command returned false');

			dvConfig.spec.datasources[0].properties.length.should.equal(oldLen+1);
			should.exist(dvConfig.spec.datasources[0].properties.find( (element: Property) => {
				return element.name === entryName && element.value === entryValue;
			}));
			dvConfig = await utils.loadModelFromFile(vdbFile);
			dsConfig = utils.getDataSourceByName(dvConfig, dsName);
		}
	}

	async function editDataSourceEntryWithValidParameters(dvConfig: DataVirtConfig, dsConfig: DataSourceConfig, vdbFile: string, entryName: string, entryValue: string) {
		const oldLen: number = dvConfig.spec.datasources[0].properties.length;
		const success = await editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, vdbFile, entryName, entryValue);
		should.equal(true, success, 'Execution of the Edit DataSource command returned false');
		dvConfig.spec.datasources[0].properties.length.should.equal(oldLen);
		should.exist(dvConfig.spec.datasources[0].properties.find( (element: Property) => {
			return element.name === entryName && element.value === entryValue;
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

		afterEach( () => {
			cleanupVDB();
		});

		it('should create a datasource entry inside a datasource when handing over valid parameters', async () => {
			const oldLen: number = dvConfig.spec.datasources[0].properties.length;
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, constants.REFERENCE_TYPE_VALUE, entryName, entryValue);
			should.equal(true, created, 'Execution of the Create DataSource Entry command returned false');

			dvConfig.spec.datasources[0].properties.length.should.equal(oldLen+1);
			should.exist(dvConfig.spec.datasources[0].properties.find( (element: Property) => {
				return element.name === entryName && element.value === entryValue;
			}));
		});

		it('should create a secret reference datasource entry inside a datasource when handing over valid parameters', async () => {
			const oldLen: number = dvConfig.spec.datasources[0].properties.length;
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, constants.REFERENCE_TYPE_SECRET, entryName, entryValue, 'refName', 'refKey');
			should.equal(true, created, 'Execution of the Create DataSource Entry command returned false');

			dvConfig.spec.datasources[0].properties.length.should.equal(oldLen+1);
			should.exist(dvConfig.spec.datasources[0].properties.find( (element: Property) => {
				return element.name === entryName && utils.isSecretRef(element.valueFrom) && element.valueFrom.secretKeyRef.key === 'refKey' && element.valueFrom.secretKeyRef.name === 'refName';
			}));
		});

		it('should create a configmap reference datasource entry inside a datasource when handing over valid parameters', async () => {
			const oldLen: number = dvConfig.spec.datasources[0].properties.length;
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, constants.REFERENCE_TYPE_CONFIGMAP, entryName, entryValue, 'refName', 'refKey');
			should.equal(true, created, 'Execution of the Create DataSource Entry command returned false');

			dvConfig.spec.datasources[0].properties.length.should.equal(oldLen+1);
			should.exist(dvConfig.spec.datasources[0].properties.find( (element: Property) => {
				return element.name === entryName && utils.isConfigMapRef(element.valueFrom) && element.valueFrom.configMapKeyRef.key === 'refKey' && element.valueFrom.configMapKeyRef.name === 'refName';
			}));
		});

		it('should not create a datasource entry inside a datasource when handing over invalid model', async () => {
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(undefined, dsConfig, vdbFile, constants.REFERENCE_TYPE_VALUE, entryName, entryValue);
			should.equal(false, created, 'Execution of the Create DataSource Entry command returned true, but should not.');
		});

		it('should not create a datasource entry inside a datasource when handing over invalid datasource config', async () => {
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, undefined, vdbFile, constants.REFERENCE_TYPE_VALUE, entryName, entryValue);
			should.equal(false, created, 'Execution of the Create DataSource Entry command returned true, but should not.');
		});

		it('should not create a datasource entry inside a datasource when handing over invalid file', async () => {
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, undefined, constants.REFERENCE_TYPE_VALUE, entryName, entryValue);
			should.equal(false, created, 'Execution of the Create DataSource Entry command returned true, but should not.');
		});

		it('should not create a datasource entry inside a datasource when handing over invalid entry key', async () => {
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, constants.REFERENCE_TYPE_VALUE, undefined, entryValue);
			should.equal(false, created, 'Execution of the Create DataSource Entry command returned true, but should not.');
		});

		it('should not create a datasource entry inside a datasource when handing over invalid entry value', async () => {
			const created = await createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, constants.REFERENCE_TYPE_VALUE, entryName, undefined);
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
			await editDataSourceEntryWithValidParameters(dvConfig, dsConfig, vdbFile, entryName, 'XYZVALUE');
		});

		it('should return true when changing a datasource entry value to an empty string', async () => {
			await editDataSourceEntryWithValidParameters(dvConfig, dsConfig, vdbFile, entryName, '');
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

		it('should return true when deleting a datasource entry with valid parameters', async () => {
			const oldLen: number = dvConfig.spec.datasources[0].properties.length;
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, vdbFile, entryName);
			should.equal(true, success, 'Execution of the Delete DataSource command returned false');

			dvConfig.spec.datasources[0].properties.length.should.equal(oldLen-1);
			should.not.exist(dvConfig.spec.datasources[0].properties.find( (element: Property) => {
				return element.name === entryName;
			}));
		});

		it('should return false when deleting a datasource entry with invalid model', async () => {
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(undefined, dsConfig, vdbFile, entryName);
			should.equal(false, success, 'Execution of the Delete DataSource command returned true, but it should not');
		});

		it('should return false when deleting a datasource entry with invalid datasource config', async () => {
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, undefined, vdbFile, entryName);
			should.equal(false, success, 'Execution of the Delete DataSource command returned true, but it should not');
		});

		it('should return false when deleting a datasource entry with invalid file', async () => {
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, undefined, entryName);
			should.equal(false, success, 'Execution of the Delete DataSource command returned true, but it should not');
		});

		it('should return false when deleting a datasource entry with invalid key', async () => {
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, vdbFile, undefined);
			should.equal(false, success, 'Execution of the Delete DataSource command returned true, but it should not');
		});

		it('should return false when deleting a datasource entry with not existing key', async () => {
			const success = await deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, vdbFile, 'NOT_EXISTING');
			should.equal(false, success, 'Execution of the Delete DataSource command returned true, but it should not');
		});
	});
});
