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
	let p: string;
	let templFolder: string;

	before(() => {
		extension.fillDataTypes();
		p = vscode.workspace.workspaceFolders[0].uri.fsPath;
		should.exist(p);
		p.should.contain('testFixture');
		templFolder = path.join(p, '../resources/');
	});

	context('Create DataSource', () => {
		const name = 'newvdb';
		let f: string;

		beforeEach( (done) => {
			createVDBCommand.handleVDBCreation(p, name, templFolder)
			.then( (createdVDB) => {
				if (createdVDB) {
					f = path.join(p, `${name}.yaml`);
					fs.existsSync(f).should.equal(true);
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
			if (fs.existsSync(f)) {
				fs.unlinkSync(f);
			}
		});

		it('should generate a valid datasource definition inside a VDB when handing over valid parameters', (done) => {
			const dsName: string = 'MyMongoDB';
			const dsType: string = 'MongoDB';
			const mongoTempl: mongoDBDS.MongoDBDataSource = new mongoDBDS.MongoDBDataSource(dsName);

			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, f)
				.then( (createdDS) => {
					if (createdDS) {
						const dvConfig2: IDVConfig = utils.loadModelFromFile(f);
						dvConfig2.should.deep.equal(dvConfig);
						dvConfig2.spec.env.length.should.deep.equal(mongoTempl.entries.size);
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
			const dsName: string = undefined;
			const dsType: string = 'MongoDB';

			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, f)
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
			const dsName: string = 'MyMongoDB';
			const dsType: string = undefined;

			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, f)
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
			const dsName: string = 'MyMongoDB';
			const dsType: string = 'MongoDB';

			const dvConfig: IDVConfig = undefined;
			createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, f)
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
			const dsName: string = 'MyMongoDB';
			const dsType: string = 'MongoDB';

			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
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
		const name = 'newvdb';
		const dsName: string = 'MyMongoDB';
		const dsType: string = 'MongoDB';
		const prefix: string = 'SPRING_TEIID_DATA_MONGODB_MYMONGODB';
		const mongoTempl: mongoDBDS.MongoDBDataSource = new mongoDBDS.MongoDBDataSource(dsName);
		let f: string;

		beforeEach( (done) => {
			createVDBCommand.handleVDBCreation(p, name, templFolder)
			.then( (createdVDB) => {
				if (createdVDB) {
					f = path.join(p, `${name}.yaml`);
					fs.existsSync(f).should.equal(true);
					const dvConfig: IDVConfig = utils.loadModelFromFile(f);
					createDSCommand.handleDataSourceCreation(dsName, dsType, dvConfig, f)
						.then( (createdDS) => {
							if (createdDS) {
								const dvConfig2: IDVConfig = utils.loadModelFromFile(f);
								dvConfig2.should.deep.equal(dvConfig);
								dvConfig2.spec.env.length.should.deep.equal(mongoTempl.entries.size);
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
			if (fs.existsSync(f)) {
				fs.unlinkSync(f);
			}
		});

		it('should delete a datasource definition inside a VDB when handing over valid parameters', (done) => {
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			deleteDSCommand.handleDataSourceDeletion(prefix, dvConfig, f)
				.then( (deletedDS) => {
					if (deletedDS) {
						dvConfig.spec.env.length.should.equal(0);
						const dvConfig2: IDVConfig = utils.loadModelFromFile(f);
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			deleteDSCommand.handleDataSourceDeletion(undefined, dvConfig, f)
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
			deleteDSCommand.handleDataSourceDeletion(prefix, undefined, f)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			deleteDSCommand.handleDataSourceDeletion(prefix, dvConfig, undefined)
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
