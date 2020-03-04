'use strict';

import * as chai from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as vscode from 'vscode';
import * as utils from '../utils';
import * as extension from '../extension';
import { handleVDBCreation } from '../commands/CreateVDBCommand';

const YAML = require('yaml');

const expect = chai.expect;
chai.use(sinonChai);

describe('Create VDB Test', function () {

	let sandbox: sinon.SinonSandbox;
	let createOutputChannelSpy: sinon.SinonSpy;
	
	before(function () {
		extension.disposeExtensionOutputChannel();
		sandbox = sinon.createSandbox();
		createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
	});

	after(function () {
		sandbox.restore();
		createOutputChannelSpy.restore();
		extension.disposeExtensionOutputChannel();
	});

	afterEach(function () {
		createOutputChannelSpy.resetHistory();
	});

	it('Test generation of VDB project file', function (done) {
		let name: string = 'tester';
		let p: string = path.normalize(vscode.workspace.workspaceFolders[0].uri.fsPath);
		let templPath: string = path.join(p, '..', 'resources');
		handleVDBCreation(p, name, templPath).then( (success: boolean) => {
			expect(success).to.be.true;
			expect(utils.validateFileNotExisting(name)).to.not.be.undefined;
			fs.unlinkSync(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, `${name}.yaml`));
			done();
		});
	});
});
