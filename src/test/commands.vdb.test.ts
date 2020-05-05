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

import { fail } from 'assert';
import * as chai from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as sinonChai from 'sinon-chai';
import * as vscode from 'vscode';
import * as createVDBCommand from '../commands/CreateVDBCommand';
import * as extension from '../extension';
import * as utils from '../utils';
import * as deleteVDBCommand from '../commands/DeleteVDBCommand';

chai.use(sinonChai);
const should = chai.should();

describe('Commands Tests', () => {
	const name = 'newvdb';

	let workspacePath: string;
	let templateFolder: string;
	let vdbFile: string;

	before(() => {
		extension.fillDataTypes();
		workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		should.exist(workspacePath);
		workspacePath.should.contain('testFixture');
		templateFolder = path.join(workspacePath, '../resources/');
	});

	beforeEach( () => {
		vdbFile = path.join(workspacePath, `${name}.yaml`);
	});

	afterEach( () => {
		if (vdbFile && fs.existsSync(vdbFile)) {
			fs.unlinkSync(vdbFile);
		}
	});

	context('Create VDB', () => {

		it('should generate a valid VDB file when passing valid parameters', async () => {
			const success = await createVDBCommand.handleVDBCreation(workspacePath, name, templateFolder);
			should.equal(true, success, 'Execution of the createVDBCommand returned false');
			fs.existsSync(vdbFile).should.equal(true);
			const dvConfig = utils.loadModelFromFile(vdbFile);
			should.exist(dvConfig);
			should.equal(dvConfig.metadata.name, name);
			dvConfig.spec.build.source.ddl.should.contain(name);
		});

		it('should not generate a VDB file when passing invalid file name', async () => {
			try {
				await createVDBCommand.handleVDBCreation(workspacePath, undefined, templateFolder);
				fail('create command did not throw exception when passing invalid name');
			} catch (error) {
				should.exist(error);
			}
		});

		it('should not generate a VDB file when passing invalid folder name', async () => {
			try {
				await createVDBCommand.handleVDBCreation(undefined, name, templateFolder);
				fail('create command did not throw exception when passing invalid workspace path');
			} catch (error) {
				should.exist(error);
			}
		});
	});

	context('Delete VDB', () => {

		beforeEach( async () => {
			const success = await createVDBCommand.handleVDBCreation(workspacePath, name, templateFolder);
			should.equal(true, success, 'Execution of the createVDBCommand returned false');
			fs.existsSync(vdbFile).should.equal(true);
		});

		it('should delete a VDB file when passing valid parameters', async () => {
			const success = await deleteVDBCommand.handleVDBDeletion(name, vdbFile);
			should.equal(true, success, `Execution of the deleteVDBCommand returned false for VDB ${name} with file ${vdbFile}`);
			fs.existsSync(vdbFile).should.equal(false);
			const dvConfig = utils.loadModelFromFile(vdbFile);
			should.not.exist(dvConfig);
		});

		it('should not delete a VDB file when passing invalid file name', async () => {
			try {
				await deleteVDBCommand.handleVDBDeletion(name, `${vdbFile}.not.existing.yaml`);
				fail('delete command did not throw exception when passing invalid file');
			} catch (error) {
				should.exist(error);
			}
		});

		it('should not generate a VDB file when passing undefined as file', async () => {
			try {
				await createVDBCommand.handleVDBCreation(name, undefined);
				fail('delete command did not throw exception when passing undefined instead of the file');
			} catch (error) {
				should.exist(error);
			}
		});
	});
});
