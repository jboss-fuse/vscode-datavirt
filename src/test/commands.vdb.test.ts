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
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as vscode from 'vscode';
import * as constants from '../constants';
import * as utils from '../utils';

chai.use(sinonChai);
const should = chai.should();
const waitUntil = require('async-wait-until');

describe('Commands Tests', () => {
	let showInputBoxStub: sinon.SinonStub;
	let commandSpy: sinon.SinonSpy;
	let workspacePath: string;
	let vdbFile: string;

	function cleanupVDB(): void {
		if (vdbFile && fs.existsSync(vdbFile)) {
			fs.unlinkSync(vdbFile);
		}
	}

	context('Create VDB', () => {

		const name: string = 'sample';

		before( async () => {
			workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
			should.exist(workspacePath, `Unable to obtain the current workspace path.`);
			workspacePath.should.contain('test Fixture with speci@l chars');
		});

		beforeEach( () => {
			vdbFile = path.join(workspacePath, `${name}.yaml`);
			cleanupVDB();
			showInputBoxStub = sinon.stub(vscode.window, 'showInputBox');
			commandSpy = sinon.spy(vscode.commands, 'executeCommand');
		});

		afterEach( () => {
			showInputBoxStub.restore();
			commandSpy.restore();
			cleanupVDB();
		});

		it('should generate a valid VDB file when handing over valid parameters and open the ddl in an editor', async () => {
			showInputBoxStub.onFirstCall().returns(Promise.resolve(name));
			await vscode.commands.executeCommand('datavirt.create.vdb');
			fs.existsSync(vdbFile).should.equal(true, `The YAML file for VDB ${name} was not found.`);
			const dvConfig = await utils.loadModelFromFile(vdbFile);
			should.exist(dvConfig);
			should.equal(dvConfig.metadata.name, name);
			dvConfig.spec.build.source.ddl.should.contain(name);

			const expectedFileName: string = `${name}${constants.DDL_FILE_EXT}`;
			await waitUntil(() => {
				return vscode.window.activeTextEditor?.document.fileName.endsWith(expectedFileName);
			}, 5000, `DDL editor has not opened for ${expectedFileName}`);
			commandSpy.should.have.been.calledWith('datavirt.edit.schema');
		});
	});
});
