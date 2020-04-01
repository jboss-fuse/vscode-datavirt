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
import * as createDSEntryCommand from '../commands/CreateDataSourceEntryCommand';
import * as deleteDSEntryCommand from '../commands/DeleteDataSourceEntryCommand';
import * as editDSEntryCommand from '../commands/EditDataSourceEntryCommand';
import * as mongoDBDS from '../model/datasources/MongoDBDataSource';
import { IDVConfig, IDataSourceConfig, IEnv } from '../model/DataVirtModel';

chai.use(sinonChai);
const should = chai.should();

describe('Commands Tests', () => {
	const name = 'newvdb';
	const dsName: string = 'MyMongoDB';
	const dsType: string = 'MongoDB';
	const prefix: string = 'SPRING_TEIID_DATA_MONGODB_MYMONGODB';
	const mongoTempl: mongoDBDS.MongoDBDataSource = new mongoDBDS.MongoDBDataSource(dsName);
	const mongoDSType: string = mongoTempl.type;
	let vdbFile: string;
	let workspacePath: string;
	let templateFolder: string;

	function prepareDataSource(dvConfig: IDVConfig, dataSourceName: string, dataSourceType: string): IDataSourceConfig {
		let datasourceConfig = {
			name: dataSourceName,
			type: dataSourceType,
			entries: new Map()
		};
		dvConfig.spec.env.forEach( (element: IEnv) => {
			const key: string = element.name.slice(prefix.length+1);
			datasourceConfig.entries.set(key, element.value);
		});
		return datasourceConfig;
	}

	before(() => {
		extension.fillDataTypes();
		workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
		should.exist(workspacePath);
		workspacePath.should.contain('testFixture');
		templateFolder = path.join(workspacePath, '../resources/');
	});

	context('Create DataSource Entry', () => {
		const entryName: string = 'NEWKEY';
		const entryValue: string = 'NEWVALUE';

		let dvConfig: IDVConfig;
		let dsConfig: IDataSourceConfig;

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
								dvConfig2.spec.env.length.should.deep.equal(mongoTempl.entries.size);

								dvConfig = utils.loadModelFromFile(vdbFile);
								dsConfig = prepareDataSource(dvConfig, dsName, mongoDSType);

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

		it('should create a datasource entry inside a datasource when handing over valid parameters', (done) => {
			const oldLen: number = dvConfig.spec.env.length;
			createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, entryName, entryValue)
				.then( (created) => {
					if (created) {
						dvConfig.spec.env.length.should.equal(oldLen+1);
						should.exist(dvConfig.spec.env.find( (element) => {
							return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, entryName) && element.value === entryValue;
						}));
						done();
					} else {
						done(new Error('Execution of the Create DataSource Entry command returned false'));
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not create a datasource entry inside a datasource when handing over invalid model', (done) => {
			createDSEntryCommand.handleDataSourceEntryCreation(undefined, dsConfig, vdbFile, entryName, entryValue)
				.then( (created) => {
					if (created) {
						done(new Error('Execution of the Create DataSource Entry command returned true, but should not.'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not create a datasource entry inside a datasource when handing over invalid datasource config', (done) => {
			createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, undefined, vdbFile, entryName, entryValue)
				.then( (created) => {
					if (created) {
						done(new Error('Execution of the Create DataSource Entry command returned true, but should not.'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not create a datasource entry inside a datasource when handing over invalid file', (done) => {
			createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, undefined, entryName, entryValue)
				.then( (created) => {
					if (created) {
						done(new Error('Execution of the Create DataSource Entry command returned true, but should not.'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not create a datasource entry inside a datasource when handing over invalid entry key', (done) => {
			createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, undefined, entryValue)
				.then( (created) => {
					if (created) {
						done(new Error('Execution of the Create DataSource Entry command returned true, but should not.'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should not create a datasource entry inside a datasource when handing over invalid entry value', (done) => {
			createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, entryName, undefined)
				.then( (created) => {
					if (created) {
						done(new Error('Execution of the Create DataSource Entry command returned true, but should not.'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});
	});

	context('Modify DataSource Entry', () => {
		const entryName: string = 'NEWKEY';
		const entryValue: string = 'NEWVALUE';

		let dvConfig: IDVConfig;
		let dsConfig: IDataSourceConfig;

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
								dvConfig2.spec.env.length.should.deep.equal(mongoTempl.entries.size);

								dvConfig = utils.loadModelFromFile(vdbFile);
								dsConfig = prepareDataSource(dvConfig, dsName, mongoDSType);
								const oldLen: number = dvConfig.spec.env.length;
								createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, entryName, entryValue)
									.then( (created) => {
										if (created) {
											dvConfig.spec.env.length.should.equal(oldLen+1);
											should.exist(dvConfig.spec.env.find( (element) => {
												return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, entryName) && element.value === entryValue;
											}));
											dvConfig = utils.loadModelFromFile(vdbFile);
											dsConfig = prepareDataSource(dvConfig, dsName, mongoDSType);
											done();
										} else {
											done(new Error('Execution of the Create DataSource Entry command returned false'));
										}
									})
									.catch( (err) => {
										done(err);
									});
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

		it('should return true when modifying a datasource entry with valid parameters', (done) => {
			const oldLen: number = dvConfig.spec.env.length;
			const newVal: string = 'XYZVALUE';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, vdbFile, entryName, newVal)
				.then( (success) => {
					if (success) {
						dvConfig.spec.env.length.should.equal(oldLen);
						should.exist(dvConfig.spec.env.find( (element) => {
							return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, entryName) && element.value === newVal;
						}));
						done();
					} else {
						done(new Error('Execution of the Edit DataSource command returned false'));
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return true when changing a datasource entry value to an empty string', (done) => {
			const oldLen: number = dvConfig.spec.env.length;
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, vdbFile, entryName, newVal)
				.then( (success) => {
					if (success) {
						dvConfig.spec.env.length.should.equal(oldLen);
						should.exist(dvConfig.spec.env.find( (element) => {
							return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, entryName) && element.value === newVal;
						}));
						done();
					} else {
						done(new Error('Execution of the Edit DataSource command returned false'));
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return false when changing a datasource entry with an invalid model', (done) => {
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(undefined, dsConfig, vdbFile, entryName, newVal)
				.then( (success) => {
					if (success) {
						done(new Error('Execution of the Edit DataSource command returned true, but should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return false when changing a datasource entry with an invalid datasource config', (done) => {
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, undefined, vdbFile, entryName, newVal)
				.then( (success) => {
					if (success) {
						done(new Error('Execution of the Edit DataSource command returned true, but should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return false when changing a datasource entry with an file', (done) => {
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, undefined, entryName, newVal)
				.then( (success) => {
					if (success) {
						done(new Error('Execution of the Edit DataSource command returned true, but should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return false when changing a datasource entry with an invalid key', (done) => {
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, vdbFile, undefined, newVal)
				.then( (success) => {
					if (success) {
						done(new Error('Execution of the Edit DataSource command returned true, but should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return false when changing a datasource entry with a not existing key', (done) => {
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, vdbFile, 'NOT_EXISTING', newVal)
				.then( (success) => {
					if (success) {
						done(new Error('Execution of the Edit DataSource command returned true, but should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return false when changing a datasource entry with an invalid value', (done) => {
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, vdbFile, entryName, undefined)
				.then( (success) => {
					if (success) {
						done(new Error('Execution of the Edit DataSource command returned true, but should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});
	});

	context('Delete DataSource Entry', () => {
		const entryName: string = 'NEWKEY';
		const entryValue: string = 'NEWVALUE';

		let dvConfig: IDVConfig;
		let dsConfig: IDataSourceConfig;

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
								dvConfig2.spec.env.length.should.deep.equal(mongoTempl.entries.size);

								dvConfig = utils.loadModelFromFile(vdbFile);
								dsConfig = prepareDataSource(dvConfig, dsName, mongoDSType);

								const oldLen: number = dvConfig.spec.env.length;
								createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, vdbFile, entryName, entryValue)
									.then( (created) => {
										if (created) {
											dvConfig.spec.env.length.should.equal(oldLen+1);
											should.exist(dvConfig.spec.env.find( (element) => {
												return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, entryName) && element.value === entryValue;
											}));
											dvConfig = utils.loadModelFromFile(vdbFile);
											dsConfig = prepareDataSource(dvConfig, dsName, mongoDSType);

											done();
										} else {
											done(new Error('Execution of the Create DataSource Entry command returned false'));
										}
									})
									.catch( (err) => {
										done(err);
									});
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

		it('should return true when modifying a datasource entry with valid parameters', (done) => {
			const oldLen: number = dvConfig.spec.env.length;
			deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, vdbFile, entryName)
				.then( (success) => {
					if (success) {
						dvConfig.spec.env.length.should.equal(oldLen-1);
						should.not.exist(dvConfig.spec.env.find( (element) => {
							return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, entryName);
						}));
						done();
					} else {
						done(new Error('Execution of the Edit DataSource command returned false'));
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return false when deleting a datasource entry with invalid model', (done) => {
			deleteDSEntryCommand.handleDataSourceEntryDeletion(undefined, dsConfig, vdbFile, entryName)
				.then( (success) => {
					if (success) {
						done(new Error('Execution of the Edit DataSource command returned true, but it should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return false when deleting a datasource entry with invalid datasource config', (done) => {
			deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, undefined, vdbFile, entryName)
				.then( (success) => {
					if (success) {
						done(new Error('Execution of the Edit DataSource command returned true, but it should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return false when deleting a datasource entry with invalid file', (done) => {
			deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, undefined, entryName)
				.then( (success) => {
					if (success) {
						done(new Error('Execution of the Edit DataSource command returned true, but it should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return false when deleting a datasource entry with invalid key', (done) => {
			deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, vdbFile, undefined)
				.then( (success) => {
					if (success) {
						done(new Error('Execution of the Edit DataSource command returned true, but it should not'));
					} else {
						done();
					}
				})
				.catch( (err) => {
					done(err);
				});
		});

		it('should return false when deleting a datasource entry with not existing key', (done) => {
			deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, vdbFile, 'NOT_EXISTING')
				.then( (success) => {
					if (success) {
						done(new Error('Execution of the Edit DataSource command returned true, but it should not'));
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
