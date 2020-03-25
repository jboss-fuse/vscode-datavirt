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
import { IDVConfig } from '../model/DataVirtModel';

chai.use(sinonChai);
const should = chai.should();

describe('Commands Tests', () => {
	context('Create VDB', () => {
		it('should generate a valid VDB file when handing over valid parameters', (done) => {
			extension.fillDataTypes();
			const p = vscode.workspace.workspaceFolders[0].uri.fsPath;
			should.exist(p);
			p.should.contain('testFixture');
			const name = 'newvdb';
			const templFolder = path.join(p, '../resources/');
			createVDBCommand.handleVDBCreation(p, name, templFolder)
				.then( (success) => {
					if (success) {
						const f = path.join(p, `${name}.yaml`);
						fs.existsSync(f).should.equal(true);
						fs.unlinkSync(f);
						done();
					} else {
						done(new Error('Execution of the command returned false'));
					}
				})
				.catch( (err) => {
					done(err);
				});
		});
	});

	context('Create DataSource', () => {
		it('should generate a valid datasource definition inside a VDB when handing over valid parameters', (done) => {
			extension.fillDataTypes();
			const p = vscode.workspace.workspaceFolders[0].uri.fsPath;
			should.exist(p);
			p.should.contain('testFixture');
			const name = 'newvdb';
			const templFolder = path.join(p, '../resources/');
			createVDBCommand.handleVDBCreation(p, name, templFolder)
				.then( (createdVDB) => {
					if (createdVDB) {
						const f = path.join(p, `${name}.yaml`);
						fs.existsSync(f).should.equal(true);

						const dsName: string = 'MyMongoDB';
						const dsType: string = 'MongoDB';
						const dvConfig: IDVConfig = utils.loadModelFromFile(f);
						createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, f)
							.then( (createdDS) => {
								if (createdDS) {
									const dvConfig2: IDVConfig = utils.loadModelFromFile(f);
									dvConfig2.should.deep.equal(dvConfig);
									fs.unlinkSync(f);
									done();
								} else {
									fs.unlinkSync(f);
									done(new Error('Execution of the Create DataSource command returned false'));
								}
							})
							.catch( (err) => {
								fs.unlinkSync(f);
								done(err);
							});
					} else {
						done(new Error('Execution of the command Create VDB returned false'));
					}
				})
				.catch( (err) => {
					done(err);
				});
		});
	});
});
