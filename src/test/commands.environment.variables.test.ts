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
import * as createEnvVarCommand from '../commands/CreateEnvironmentVariableCommand';
import { DataVirtConfig, Property } from '../model/DataVirtModel';
import * as deleteEnvVarEntryCommand from '../commands/DeleteEnvironmentVariableCommand';
import * as editEnvVarCommand from '../commands/EditEnvironmentVariableCommand';
import * as extension from '../extension';
import * as utils from '../utils';

chai.use(sinonChai);
const should = chai.should();

describe('Commands Tests', () => {
	const name = 'newvdbenv';
	const entryName: string = 'NEWKEY';
	const entryValue: string = 'newvalue';

	let vdbFile: string;
	let workspacePath: string;
	let templateFolder: string;

	let dvConfig: DataVirtConfig;

	function cleanupVDB(): void {
		if (vdbFile && fs.existsSync(vdbFile)) {
			fs.unlinkSync(vdbFile);
		}
	}

	async function initializeGlobals(createEnvVar: boolean) {
		const createdVDB = await createVDBCommand.handleVDBCreation(workspacePath, name, templateFolder);
		should.equal(true, createdVDB, 'Execution of the command Create VDB returned false');

		vdbFile = path.join(workspacePath, `${name}.yaml`);
		fs.existsSync(vdbFile).should.equal(true);
		dvConfig = await utils.loadModelFromFile(vdbFile);

		if (createEnvVar) {
			await createEnvironmentVariableWithValidParameters(dvConfig, vdbFile, constants.REFERENCE_TYPE_VALUE, entryName, entryValue, undefined, undefined);
		}
	}

	async function createEnvironmentVariableWithValidParameters(dvConfig: DataVirtConfig, vdbFile: string, entryType: string, entryName: string, entryValue: string, refName: string, refKey: string) {
		const oldLen: number = dvConfig.spec.env.length;
		const created = await createEnvVarCommand.handleEnvironmentVariableCreation(dvConfig, dvConfig.spec.env, vdbFile, entryType, entryName, entryValue);
		should.equal(true, created, 'Execution of the Create Environment Variable command returned false');

		dvConfig.spec.env.length.should.equal(oldLen+1);
		should.exist(dvConfig.spec.env.find( (element: Property) => {
			return element.name === entryName;
		}));
	}

	async function editEnvironmentVariableWithValidParameters(dvConfig: DataVirtConfig, environment: Property[], vdbFile: string, entryName: string, entryValue: string) {
		const oldLen: number = dvConfig.spec.env.length;
		const success = await editEnvVarCommand.handleEnvironmentVariableEdit(dvConfig, environment, vdbFile, entryName, entryValue);
		should.equal(true, success, 'Execution of the Edit Environment Variable command returned false');
		dvConfig.spec.env.length.should.equal(oldLen);
		should.exist(dvConfig.spec.env.find( (element: Property) => {
			return element.name === entryName;
		}));
	}

	before(() => {
		extension.fillDataTypes();
		workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		should.exist(workspacePath);
		workspacePath.should.contain('testFixture');
		templateFolder = path.join(workspacePath, '../resources/');
	});

	after(() => {
		cleanupVDB();
	});

	context('Create Environment Variable', () => {

		beforeEach( async () => {
			await initializeGlobals(false);
		});

		afterEach( () => {
			cleanupVDB();
		});

		it('should create an environment variable when handing over valid parameters', async () => {
			await createEnvironmentVariableWithValidParameters(dvConfig, vdbFile, constants.REFERENCE_TYPE_VALUE, entryName, entryValue, undefined, undefined);
		});

		it('should create an environment variable when handing over empty value', async () => {
			await createEnvironmentVariableWithValidParameters(dvConfig, vdbFile, constants.REFERENCE_TYPE_VALUE, entryName, '', undefined, undefined);
		});

		it('should create an environment variable when handing over undefined value', async () => {
			await createEnvironmentVariableWithValidParameters(dvConfig, vdbFile, constants.REFERENCE_TYPE_VALUE, entryName, undefined, undefined, undefined);
		});

		it('should create a secret reference environment variable when handing over valid parameters', async () => {
			await createEnvironmentVariableWithValidParameters(dvConfig, vdbFile, constants.REFERENCE_TYPE_SECRET, entryName, entryValue, 'refName', 'refKey');
		});

		it('should create a configmap reference environment variable when handing over valid parameters', async () => {
			await createEnvironmentVariableWithValidParameters(dvConfig, vdbFile, constants.REFERENCE_TYPE_CONFIGMAP, entryName, entryValue, 'refName', 'refKey');
		});

		it('should not create an environment variable when handing over invalid model', async () => {
			const created = await createEnvVarCommand.handleEnvironmentVariableCreation(undefined, dvConfig.spec.env, vdbFile, constants.REFERENCE_TYPE_VALUE, entryName, entryValue);
			should.equal(false, created, 'Execution of the Create Environment Variable command returned true, but should not.');
		});

		it('should not create an environment variable when handing over invalid environment', async () => {
			const created = await createEnvVarCommand.handleEnvironmentVariableCreation(dvConfig, undefined, vdbFile, constants.REFERENCE_TYPE_VALUE, entryName, entryValue);
			should.equal(false, created, 'Execution of the Create Environment Variable command returned true, but should not.');
		});

		it('should not create an environment variable when handing over invalid file', async () => {
			const created = await createEnvVarCommand.handleEnvironmentVariableCreation(dvConfig, dvConfig.spec.env, undefined, constants.REFERENCE_TYPE_VALUE, entryName, entryValue);
			should.equal(false, created, 'Execution of the Create Environment Variable command returned true, but should not.');
		});

		it('should not create an environment variable when handing over invalid entry type', async () => {
			const created = await createEnvVarCommand.handleEnvironmentVariableCreation(dvConfig, dvConfig.spec.env, vdbFile, undefined, entryName, entryValue);
			should.equal(false, created, 'Execution of the Create Environment Variable command returned true, but should not.');
		});

		it('should not create an environment variable when handing over invalid entry key', async () => {
			const created = await createEnvVarCommand.handleEnvironmentVariableCreation(dvConfig, dvConfig.spec.env, vdbFile, constants.REFERENCE_TYPE_VALUE, undefined, entryValue);
			should.equal(false, created, 'Execution of the Create Environment Variable command returned true, but should not.');
		});
	});

	context('Modify Environment Variable', () => {

		beforeEach( async () => {
			await initializeGlobals(true);
		});

		afterEach( () => {
			cleanupVDB();
		});

		it('should return true when modifying an environment variable with valid parameters', async () => {
			await editEnvironmentVariableWithValidParameters(dvConfig, dvConfig.spec.env, vdbFile, entryName, 'XYZVALUE');
		});

		it('should return true when changing an environment variable value to an empty string', async () => {
			await editEnvironmentVariableWithValidParameters(dvConfig, dvConfig.spec.env, vdbFile, entryName, '');
		});

		it('should return true when changing an environment variable value to an undefined value', async () => {
			await editEnvironmentVariableWithValidParameters(dvConfig, dvConfig.spec.env, vdbFile, entryName, undefined);
		});

		it('should return false when changing an environment variable with an invalid model', async () => {
			const success = await editEnvVarCommand.handleEnvironmentVariableEdit(undefined, dvConfig.spec.env, vdbFile, entryName, entryValue);
			should.equal(false, success, 'Execution of the Edit Environment Variable command returned true, but should not');
		});

		it('should return false when changing an environment variable with an invalid datasource config', async () => {
			const success = await editEnvVarCommand.handleEnvironmentVariableEdit(dvConfig, undefined, vdbFile, entryName, entryValue);
			should.equal(false, success, 'Execution of the Edit Environment Variable command returned true, but should not');
		});

		it('should return false when changing an environment variable with an file', async () => {
			const success = await editEnvVarCommand.handleEnvironmentVariableEdit(dvConfig, dvConfig.spec.env, undefined, entryName, entryValue);
			should.equal(false, success, 'Execution of the Edit Environment Variable command returned true, but should not');
		});

		it('should return false when changing an environment variable with an invalid key', async () => {
			const success = await editEnvVarCommand.handleEnvironmentVariableEdit(dvConfig, dvConfig.spec.env, vdbFile, undefined, entryValue);
			should.equal(false, success, 'Execution of the Edit Environment Variable command returned true, but should not');
		});

		it('should return false when changing an environment variable with a not existing key', async () => {
			const success = await editEnvVarCommand.handleEnvironmentVariableEdit(dvConfig, dvConfig.spec.env, vdbFile, 'NOT_EXISTING', entryValue);
			should.equal(false, success, 'Execution of the Edit Environment Variable command returned true, but should not');
		});
	});

	context('Delete Environment Variable', () => {

		beforeEach( async () => {
			await initializeGlobals(true);
		});

		afterEach( () => {
			cleanupVDB();
		});

		it('should return true when deleting an environment variable with valid parameters', async () => {
			const oldLen: number = dvConfig.spec.env.length;
			const success = await deleteEnvVarEntryCommand.handleEnvironmentVariableDeletion(dvConfig, vdbFile, entryName);
			should.equal(true, success, 'Execution of the Delete Environment Variable command returned false');

			dvConfig.spec.env.length.should.equal(oldLen-1);
			should.not.exist(dvConfig.spec.env.find( (element: Property) => {
				return element.name === entryName;
			}));
		});

		it('should return false when deleting an environment variable with invalid model', async () => {
			const success = await deleteEnvVarEntryCommand.handleEnvironmentVariableDeletion(undefined, vdbFile, entryName);
			should.equal(false, success, 'Execution of the Delete Environment Variable command returned true, but it should not');
		});

		it('should return false when deleting an environment variable with invalid file', async () => {
			const success = await deleteEnvVarEntryCommand.handleEnvironmentVariableDeletion(dvConfig, undefined, entryName);
			should.equal(false, success, 'Execution of the Delete Environment Variable command returned true, but it should not');
		});

		it('should return false when deleting an environment variable with invalid key', async () => {
			const success = await deleteEnvVarEntryCommand.handleEnvironmentVariableDeletion(dvConfig, vdbFile, undefined);
			should.equal(false, success, 'Execution of the Delete Environment Variable command returned true, but it should not');
		});

		it('should return false when deleting an environment variable with not existing key', async () => {
			const success = await deleteEnvVarEntryCommand.handleEnvironmentVariableDeletion(dvConfig, vdbFile, 'NOT_EXISTING');
			should.equal(false, success, 'Execution of the Delete Environment Variable command returned true, but it should not');
		});
	});
});
