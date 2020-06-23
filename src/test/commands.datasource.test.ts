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
import * as convertDataSourceCommand from '../commands/ConvertDataSourceCommand';
import * as createVDBCommand from '../commands/CreateVDBCommand';
import * as createDSCommand from '../commands/CreateDataSourceCommand';
import { DataVirtConfig, DataSourceConfig, Property } from '../model/DataVirtModel';
import * as deleteDSCommand from '../commands/DeleteDataSourceCommand';
import * as extension from '../extension';
import * as mongoDBDS from '../model/datasources/MongoDBDataSource';
import * as utils from '../utils';

chai.use(sinonChai);
const should = chai.should();

describe('Commands Tests', () => {
	const name = 'newvdb';
	const dsName: string = 'MyMongoDB';
	const dsType: string = 'MongoDB';
	const mongoTemplate: mongoDBDS.MongoDBDataSource = new mongoDBDS.MongoDBDataSource(dsName);

	let vdbFile: string;
	let workspacePath: string;
	let templateFolder: string;
	let dvConfig: DataVirtConfig;

	function cleanupVDB(): void {
		if (vdbFile && fs.existsSync(vdbFile)) {
			fs.unlinkSync(vdbFile);
		}
	}

	async function createVDB() {
		const createdVDB = await createVDBCommand.handleVDBCreation(workspacePath, name, templateFolder);
		should.equal(true, createdVDB, 'Execution of the command Create VDB returned false');
		vdbFile = path.join(workspacePath, `${name}.yaml`);
		fs.existsSync(vdbFile).should.equal(true);
		dvConfig = await utils.loadModelFromFile(vdbFile);
	}

	async function createDataSource(dataSourceName?: string) {
		const createdDS = await createDSCommand.createDataSource(dataSourceName ? dataSourceName : dsName, dsType, dvConfig, vdbFile);
		should.equal(true, createdDS, 'Execution of the Create DataSource command returned false');

		const dvConfig2: DataVirtConfig = await utils.loadModelFromFile(vdbFile);
		dvConfig2.should.deep.equal(dvConfig);
		dvConfig2.spec.datasources[0].properties.length.should.deep.equal(mongoTemplate.properties.length);
		dvConfig = await utils.loadModelFromFile(vdbFile);
		dvConfig.spec.datasources.forEach( (element: DataSourceConfig) => {
			element.properties.forEach( (prop: Property) => {
				should.equal(prop.value, constants.EMPTY_VALUE, `DataSource ${element.name} / Property ${prop.name} does not have the <empty> string value set.`);
			});
		});
	}

	before(() => {
		extension.fillDataTypes();
		workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		should.exist(workspacePath);
		workspacePath.should.contain('test Fixture with speci@l chars');
		templateFolder = path.join(workspacePath, '../resources/');
	});

	context('Create DataSource', () => {

		beforeEach( async () => {
			await createVDB();
		});

		afterEach( () => {
			cleanupVDB();
		});

		it('should generate a valid datasource definition inside a VDB when handing over valid parameters', async () => {
			const createdDS = await createDSCommand.createDataSource(dsName, dsType, dvConfig, vdbFile);
			should.equal(true, createdDS, 'Execution of the Create DataSource command returned false');
			const dvConfig2: DataVirtConfig = await utils.loadModelFromFile(vdbFile);
			dvConfig2.should.deep.equal(dvConfig);
			dvConfig2.spec.datasources.length.should.deep.equal(dvConfig.spec.datasources.length);
		});

		it('should not generate a datasource definition inside a VDB when handing invalid name', async () => {
			const createdDS = await createDSCommand.createDataSource(undefined, dsType, dvConfig, vdbFile);
			should.equal(false, createdDS, 'Execution of the Create DataSource command returned true, but should not');
		});

		it('should not generate a datasource definition inside a VDB when handing invalid type', async () => {
			const createdDS = await createDSCommand.createDataSource(dsName, undefined, dvConfig, vdbFile);
			should.equal(false, createdDS, 'Execution of the Create DataSource command returned true, but should not');
		});

		it('should not generate a datasource definition inside a VDB when handing invalid model', async () => {
			const createdDS = await createDSCommand.createDataSource(dsName, dsType, undefined, vdbFile);
			should.equal(false, createdDS, 'Execution of the Create DataSource command returned true, but should not');
		});

		it('should not generate a datasource definition inside a VDB when handing invalid file', async () => {
			const createdDS = await createDSCommand.createDataSource(dsName, dsType, dvConfig, undefined);
			should.equal(false, createdDS, 'Execution of the Create DataSource command returned true, but should not');
		});
	});

	context('Delete DataSource', () => {

		beforeEach( async () => {
			await createVDB();
			await createDataSource();
		});

		afterEach( () => {
			cleanupVDB();
		});

		it('should delete a datasource definition inside a VDB when handing over valid parameters', async () => {
			const deletedDS = await deleteDSCommand.handleDataSourceDeletion(dsName, dvConfig, vdbFile);
			should.equal(true, deletedDS, 'Execution of the Delete DataSource command returned false');
			dvConfig.spec.datasources.length.should.equal(0);
			const dvConfig2: DataVirtConfig = await utils.loadModelFromFile(vdbFile);
			dvConfig2.spec.datasources.length.should.equal(0);
		});

		it('should not delete a datasource definition when handing over invalid model', async () => {
			const deletedDS = await deleteDSCommand.handleDataSourceDeletion(dsName, undefined, vdbFile);
			should.equal(false, deletedDS, 'Execution of the Delete DataSource command returned true, but it should not');
		});

		it('should not delete a datasource definition when handing over invalid file', async () => {
			const deletedDS = await deleteDSCommand.handleDataSourceDeletion(dsName, dvConfig, undefined);
			should.equal(false, deletedDS, 'Execution of the Delete DataSource command returned true, but it should not');
		});

		it('should not delete all datasources when deleting 1 of 2 datasources (regression test #45)', async () => {
			const newDSName = 'SOURCE2';

			const createdDS = await createDSCommand.createDataSource(newDSName, dsType, dvConfig, vdbFile);
			should.equal(true, createdDS, 'Execution of the Create DataSource command returned false');

			dvConfig = await utils.loadModelFromFile(vdbFile);
			dvConfig.spec.datasources.length.should.deep.equal(2);

			const deletedDS = await deleteDSCommand.handleDataSourceDeletion(newDSName, dvConfig, vdbFile);
			should.equal(true, deletedDS, 'Execution of the Delete DataSource command returned false');

			dvConfig = await utils.loadModelFromFile(vdbFile);
			dvConfig.spec.datasources.length.should.deep.equal(1);
		});

		it('should not always delete the last datasource (regression test FUSETOOLS2-415)', async () => {
			await createDataSource('test1');
			await createDataSource('test2');
			await createDataSource('test3');

			dvConfig = await utils.loadModelFromFile(vdbFile);
			should.equal(dvConfig.spec.datasources.length, 4);

			should.exist(utils.getDataSourceByName(dvConfig, 'test1'), 'Cannot find expected datasource test1');
			should.exist(utils.getDataSourceByName(dvConfig, 'test2'), 'Cannot find expected datasource test2');
			should.exist(utils.getDataSourceByName(dvConfig, 'test3'), 'Cannot find expected datasource test3');
			should.exist(utils.getDataSourceByName(dvConfig, dsName), `Cannot find expected datasource ${dsName}`);

			const deletedDS = await deleteDSCommand.handleDataSourceDeletion('test1', dvConfig, vdbFile);
			should.equal(true, deletedDS, 'Execution of the Delete DataSource command returned false');

			dvConfig = await utils.loadModelFromFile(vdbFile);
			should.equal(dvConfig.spec.datasources.length, 3);

			should.not.exist(utils.getDataSourceByName(dvConfig, 'test1'), 'Can still find the deleted datasource in the list!');
			should.exist(utils.getDataSourceByName(dvConfig, 'test2'), 'Cannot find expected datasource test2');
			should.exist(utils.getDataSourceByName(dvConfig, 'test3'), 'Cannot find expected datasource test3');
			should.exist(utils.getDataSourceByName(dvConfig, dsName), `Cannot find expected datasource ${dsName}`);
		});
	});

	context('Convert DataSource', () => {
		let refFilePath: string;
		let dsConfig: DataSourceConfig;
		let refName: string;

		beforeEach( async () => {
			await createVDB();
		});

		afterEach( () => {
			cleanupVDB();
			fs.unlinkSync(refFilePath);
		});

		async function createDataSource(refType: string) {
			const createdDS = await createDSCommand.createDataSource(dsName, dsType, dvConfig, vdbFile);
			should.equal(true, createdDS, 'Execution of the Create DataSource command returned false');
			dsConfig = utils.getDataSourceByName(dvConfig, dsName);
			refName = `datasource-${dsConfig.name}-${refType.toLowerCase()}`;
			refFilePath = utils.getFullReferenceFilePath(vdbFile, refName);
		}

		it('should convert a valid datasource to a config map', async () => {
			await createDataSource(constants.REFERENCE_TYPE_CONFIGMAP);
			const convertedDS = await convertDataSourceCommand.convertDataSourceToRef(dsConfig, constants.REFERENCE_TYPE_CONFIGMAP, dvConfig, vdbFile);
			should.equal(true, convertedDS, 'Execution of the Convert DataSource command returned false');
			should.equal(true, await utils.doesLocalReferenceFileExist(vdbFile, refName), `The reference file for datasource ${dsName} could not be found.`);
		});

		it('should not convert a valid datasource to a config map if config map file already exists', async () => {
			await createDataSource(constants.REFERENCE_TYPE_CONFIGMAP);
			fs.writeFileSync(refFilePath, 'test');
			should.equal(true, await utils.doesFileExist(refFilePath), `Unable to create file ${refFilePath}.`);
			const convertedDS = await convertDataSourceCommand.convertDataSourceToRef(dsConfig, constants.REFERENCE_TYPE_CONFIGMAP, dvConfig, vdbFile);
			should.equal(false, convertedDS, 'Execution of the Convert DataSource command returned true but should have failed because ref file already exists.');
			should.equal('test', fs.readFileSync(refFilePath).toString(), `File contents of the ref file did change.`);
		});

		it('should convert a valid datasource to a secret', async () => {
			await createDataSource(constants.REFERENCE_TYPE_SECRET);
			const convertedDS = await convertDataSourceCommand.convertDataSourceToRef(dsConfig, constants.REFERENCE_TYPE_SECRET, dvConfig, vdbFile);
			should.equal(true, convertedDS, 'Execution of the Convert DataSource command returned false');
			should.equal(true, await utils.doesLocalReferenceFileExist(vdbFile, refName), `The reference file for datasource ${dsName} could not be found.`);
		});

		it('should not convert a valid datasource to a secret if secret file already exists', async () => {
			await createDataSource(constants.REFERENCE_TYPE_SECRET);
			fs.writeFileSync(refFilePath, 'test');
			should.equal(true, await utils.doesFileExist(refFilePath), `Unable to create file ${refFilePath}.`);
			const convertedDS = await convertDataSourceCommand.convertDataSourceToRef(dsConfig, constants.REFERENCE_TYPE_SECRET, dvConfig, vdbFile);
			should.equal(false, convertedDS, 'Execution of the Convert DataSource command returned true but should have failed because ref file already exists.');
			should.equal('test', fs.readFileSync(refFilePath).toString(), `File contents of the ref file did change.`);
		});
	});
});
