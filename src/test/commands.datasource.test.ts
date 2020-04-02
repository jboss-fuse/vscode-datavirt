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
import * as deleteDSCommand from '../commands/DeleteDataSourceCommand';
import * as mongoDBDS from '../model/datasources/MongoDBDataSource';
import { IDVConfig } from '../model/DataVirtModel';

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
	let dvConfig: IDVConfig;

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
		dvConfig = utils.loadModelFromFile(vdbFile);
	}

	async function createDataSource() {
		const createdDS = await createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, vdbFile);
		should.equal(true, createdDS, 'Execution of the Create DataSource command returned false');

		const dvConfig2: IDVConfig = utils.loadModelFromFile(vdbFile);
		dvConfig2.should.deep.equal(dvConfig);
		dvConfig2.spec.env.length.should.deep.equal(mongoTemplate.entries.size);
		dvConfig = utils.loadModelFromFile(vdbFile);
	}

	before(() => {
		extension.fillDataTypes();
		workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		should.exist(workspacePath);
		workspacePath.should.contain('testFixture');
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
			const createdDS = await createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, vdbFile);
			should.equal(true, createdDS, 'Execution of the Create DataSource command returned false');
			const dvConfig2: IDVConfig = utils.loadModelFromFile(vdbFile);
			dvConfig2.should.deep.equal(dvConfig);
			dvConfig2.spec.env.length.should.deep.equal(mongoTemplate.entries.size);
		});

		it('should not generate a datasource definition inside a VDB when handing invalid name', async () => {
			const createdDS = await createDSCommand.handleDataSourceCreation(undefined, dsType, dvConfig, vdbFile);
			should.equal(false, createdDS, 'Execution of the Create DataSource command returned true, but should not');
		});

		it('should not generate a datasource definition inside a VDB when handing invalid type', async () => {
			const createdDS = await createDSCommand.handleDataSourceCreation(dsName, undefined, dvConfig, vdbFile);
			should.equal(false, createdDS, 'Execution of the Create DataSource command returned true, but should not');
		});

		it('should not generate a datasource definition inside a VDB when handing invalid model', async () => {
			const createdDS = await createDSCommand.handleDataSourceCreation(dsName, dsType, undefined, vdbFile);
			should.equal(false, createdDS, 'Execution of the Create DataSource command returned true, but should not');
		});

		it('should not generate a datasource definition inside a VDB when handing invalid file', async () => {
			const createdDS = await createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, undefined);
			should.equal(false, createdDS, 'Execution of the Create DataSource command returned true, but should not');
		});
	});

	context('Delete DataSource', () => {
		const prefix: string = 'SPRING_TEIID_DATA_MONGODB_MYMONGODB';

		beforeEach( async () => {
			await createVDB();
			await createDataSource();
		});

		afterEach( () => {
			cleanupVDB();
		});

		it('should delete a datasource definition inside a VDB when handing over valid parameters', async () => {
			const deletedDS = await deleteDSCommand.handleDataSourceDeletion(dsName, prefix, dvConfig, vdbFile);
			should.equal(true, deletedDS, 'Execution of the Delete DataSource command returned false');
			dvConfig.spec.env.length.should.equal(0);
			const dvConfig2: IDVConfig = utils.loadModelFromFile(vdbFile);
			dvConfig2.spec.env.length.should.equal(0);
		});

		it('should not delete a datasource definition when handing over invalid prefix', async () => {
			const deletedDS = await deleteDSCommand.handleDataSourceDeletion(dsName,undefined, dvConfig, vdbFile);
			should.equal(false, deletedDS, 'Execution of the Delete DataSource command returned true, but it should not');
		});

		it('should not delete a datasource definition when handing over invalid model', async () => {
			const deletedDS = await deleteDSCommand.handleDataSourceDeletion(dsName,prefix, undefined, vdbFile);
			should.equal(false, deletedDS, 'Execution of the Delete DataSource command returned true, but it should not');
		});

		it('should not delete a datasource definition when handing over invalid file', async () => {
			const deletedDS = await deleteDSCommand.handleDataSourceDeletion(dsName,prefix, dvConfig, undefined);
			should.equal(false, deletedDS, 'Execution of the Delete DataSource command returned true, but it should not');
		});

		it('should not delete all datasources when deleting 1 of 2 datasources (regression test #45)', async () => {
			const newDSName = 'SOURCE2';
			const prefix2: string = 'SPRING_TEIID_DATA_MONGODB_SOURCE2';

			const createdDS = await createDSCommand.handleDataSourceCreation(newDSName, dsType, dvConfig, vdbFile);
			should.equal(true, createdDS, 'Execution of the Create DataSource command returned false');

			dvConfig = utils.loadModelFromFile(vdbFile);
			dvConfig.spec.env.length.should.deep.equal(mongoTemplate.entries.size*2);

			const deletedDS = await deleteDSCommand.handleDataSourceDeletion(newDSName, prefix2, dvConfig, vdbFile);
			should.equal(true, deletedDS, 'Execution of the Delete DataSource command returned false');

			dvConfig = utils.loadModelFromFile(vdbFile);
			dvConfig.spec.env.length.should.deep.equal(mongoTemplate.entries.size);
		});
	});
});
