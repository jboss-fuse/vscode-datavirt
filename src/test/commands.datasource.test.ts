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

	before(() => {
		extension.fillDataTypes();
		workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		should.exist(workspacePath);
		workspacePath.should.contain('testFixture');
		templateFolder = path.join(workspacePath, '../resources/');
	});

	context('Create DataSource', () => {

		beforeEach( (done) => {
			createVDBCommand.handleVDBCreation(workspacePath, name, templateFolder)
			.then( (createdVDB) => {
				if (createdVDB) {
					vdbFile = path.join(workspacePath, `${name}.yaml`);
					fs.existsSync(vdbFile).should.equal(true);
					dvConfig = utils.loadModelFromFile(vdbFile);
					done();
				} else {
					done(new Error('Execution of the command Create VDB returned false'));
				}
			})
			.catch( (err) => {
				done(err);
			});
		});

		afterEach( () => {
			if (fs.existsSync(vdbFile)) {
				fs.unlinkSync(vdbFile);
			}
		});

		it('should generate a valid datasource definition inside a VDB when handing over valid parameters', (done) => {
			createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, vdbFile)
				.then( (createdDS) => {
					if (createdDS) {
						const dvConfig2: IDVConfig = utils.loadModelFromFile(vdbFile);
						dvConfig2.should.deep.equal(dvConfig);
						dvConfig2.spec.env.length.should.deep.equal(mongoTemplate.entries.size);
						done();
					} else {
						done(new Error('Execution of the Create DataSource command returned false'));
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not generate a datasource definition inside a VDB when handing invalid name', (done) => {
			createDSCommand.handleDataSourceCreation(undefined, dsType, dvConfig, vdbFile)
				.then( (createdDS) => {
					if (createdDS) {
						done(new Error('Execution of the Create DataSource command returned true, but should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not generate a datasource definition inside a VDB when handing invalid type', (done) => {
			createDSCommand.handleDataSourceCreation(dsName, undefined, dvConfig, vdbFile)
				.then( (createdDS) => {
					if (createdDS) {
						done(new Error('Execution of the Create DataSource command returned true, but should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not generate a datasource definition inside a VDB when handing invalid model', (done) => {
			createDSCommand.handleDataSourceCreation(dsName, dsType, undefined, vdbFile)
				.then( (createdDS) => {
					if (createdDS) {
						done(new Error('Execution of the Create DataSource command returned true, but should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not generate a datasource definition inside a VDB when handing invalid file', (done) => {
			createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, undefined)
				.then( (createdDS) => {
					if (createdDS) {
						done(new Error('Execution of the Create DataSource command returned true, but should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});
	});

	context('Delete DataSource', () => {
		const prefix: string = 'SPRING_TEIID_DATA_MONGODB_MYMONGODB';

		beforeEach( (done) => {
			createVDBCommand.handleVDBCreation(workspacePath, name, templateFolder)
			.then( (createdVDB) => {
				if (createdVDB) {
					vdbFile = path.join(workspacePath, `${name}.yaml`);
					fs.existsSync(vdbFile).should.equal(true);
					dvConfig = utils.loadModelFromFile(vdbFile);
					createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, vdbFile)
						.then( (createdDS) => {
							if (createdDS) {
								const dvConfig2: IDVConfig = utils.loadModelFromFile(vdbFile);
								dvConfig2.should.deep.equal(dvConfig);
								dvConfig2.spec.env.length.should.deep.equal(mongoTemplate.entries.size);
								dvConfig = utils.loadModelFromFile(vdbFile);
								done();
							} else {
								done(new Error('Execution of the Create DataSource command returned false'));
							}
						})
						.catch( (err) => {
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

		afterEach( () => {
			if (fs.existsSync(vdbFile)) {
				fs.unlinkSync(vdbFile);
			}
		});

		it('should delete a datasource definition inside a VDB when handing over valid parameters', (done) => {
			deleteDSCommand.handleDataSourceDeletion(dsName, prefix, dvConfig, vdbFile)
				.then( (deletedDS) => {
					if (deletedDS) {
						dvConfig.spec.env.length.should.equal(0);
						const dvConfig2: IDVConfig = utils.loadModelFromFile(vdbFile);
						dvConfig2.spec.env.length.should.equal(0);
						done();
					} else {
						done(new Error('Execution of the Delete DataSource command returned false'));
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not delete a datasource definition when handing over invalid prefix', (done) => {
			deleteDSCommand.handleDataSourceDeletion(dsName,undefined, dvConfig, vdbFile)
				.then( (deletedDS) => {
					if (deletedDS) {
						done(new Error('Execution of the Delete DataSource command returned true, but it should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not delete a datasource definition when handing over invalid model', (done) => {
			deleteDSCommand.handleDataSourceDeletion(dsName,prefix, undefined, vdbFile)
				.then( (deletedDS) => {
					if (deletedDS) {
						done(new Error('Execution of the Delete DataSource command returned true, but it should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not delete a datasource definition when handing over invalid file', (done) => {
			deleteDSCommand.handleDataSourceDeletion(dsName,prefix, dvConfig, undefined)
				.then( (deletedDS) => {
					if (deletedDS) {
						done(new Error('Execution of the Delete DataSource command returned true, but it should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});
	});
});
