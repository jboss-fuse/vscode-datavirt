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
import * as extension from '../extension';
import * as utils from './utils';

chai.use(sinonChai);
const should = chai.should();

describe('Extension Datavirt View Refresh Test', () => {
	const name: string = 'testvdb';

	let workspacePath: string;
	let templateFolder: string;
	let vdbFile: string;
	let datavirtProviderSpy: sinon.SinonSpy;
	let showInputBoxStub: sinon.SinonStub;

	before(() => {
		workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		should.exist(workspacePath);
		workspacePath.should.contain('testFixture');
		templateFolder = path.join(workspacePath, '../resources/');
		vdbFile = path.join(workspacePath, `${name}.yaml`);
	});

	after(() => {
		datavirtProviderSpy.restore();
		showInputBoxStub.restore();
		if (vdbFile && fs.existsSync(vdbFile)) {
			fs.unlinkSync(vdbFile);
		}
	});

	beforeEach(async () => {
		await utils.ensureExtensionActivated();
		datavirtProviderSpy = sinon.spy(extension.dataVirtProvider, 'refresh');
		showInputBoxStub = sinon.stub(vscode.window, 'showInputBox');
	});

	afterEach(() => {
		datavirtProviderSpy.resetHistory();
		showInputBoxStub.resetHistory();
	});

	it('should call refresh after creating a new vdb', async () => {
		datavirtProviderSpy.callCount.should.be.equal(0);
		showInputBoxStub.onFirstCall().returns(name);
		let success: boolean = await vscode.commands.executeCommand('datavirt.create.vdb');
		should.equal(true, success);
		datavirtProviderSpy.should.have.been.calledOnce;
	});
});
