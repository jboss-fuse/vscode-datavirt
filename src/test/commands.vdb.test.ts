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
import * as createVDBCommand from '../commands/CreateVDBCommand';

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

	context('Create VDB', () => {

		beforeEach( () => {
			vdbFile = path.join(workspacePath, `${name}.yaml`);
		});

		afterEach( () => {
			if (vdbFile && fs.existsSync(vdbFile)) {
				fs.unlinkSync(vdbFile);
			}
		});

		it('should generate a valid VDB file when handing over valid parameters', async () => {
			const success = await createVDBCommand.handleVDBCreation(workspacePath, name, templateFolder);
			should.equal(true, success, 'Execution of the createVDBCommand returned false');
			fs.existsSync(vdbFile).should.equal(true);
		});

		it('should not generate a VDB file when handing over invalid file name', async () => {
			const success = await createVDBCommand.handleVDBCreation(workspacePath, undefined, templateFolder);
			should.equal(false, success, 'Execution of the command returned true, but should not');
		});

		it('should not generate a VDB file when handing over invalid folder name', async () => {
			const success = await createVDBCommand.handleVDBCreation(undefined, name, templateFolder);
			should.equal(false, success, 'Execution of the command returned true, but should not');
		});
	});
});
