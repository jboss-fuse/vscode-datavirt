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
	let f: string;
	let p: string;
	let templFolder: string;

	before(() => {
		extension.fillDataTypes();
		p = vscode.workspace.workspaceFolders[0].uri.fsPath;
		should.exist(p);
		p.should.contain('testFixture');
		templFolder = path.join(p, '../resources/');
	});

	context('Create DataSource Entry', () => {

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

		it('should create a datasource entry inside a datasource when handing over valid parameters', (done) => {
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const oldLen: number = dvConfig.spec.env.length;
			const eName: string = 'NEWKEY';
			const eValue: string = 'NEWVALUE';
			createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, f, eName, eValue)
				.then( (created) => {
					if (created) {
						dvConfig.spec.env.length.should.equal(oldLen+1);
						should.exist(dvConfig.spec.env.find( (element) => {
							return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, eName) && element.value === eValue;
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const eName: string = 'NEWKEY';
			const eValue: string = 'NEWVALUE';
			createDSEntryCommand.handleDataSourceEntryCreation(undefined, dsConfig, f, eName, eValue)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const eName: string = 'NEWKEY';
			const eValue: string = 'NEWVALUE';
			createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, undefined, f, eName, eValue)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const eName: string = 'NEWKEY';
			const eValue: string = 'NEWVALUE';
			createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, undefined, eName, eValue)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const eValue: string = 'NEWVALUE';
			createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, f, undefined, eValue)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const eName: string = 'NEWKEY';
			createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, f, eName, undefined)
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
		const eName: string = 'NEWKEY';
		const eValue: string = 'NEWVALUE';

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

								const dsConfig: IDataSourceConfig = {
									name: dsName,
									type: mongoDSType,
									entries: new Map()
								};
								dvConfig.spec.env.forEach( (element: IEnv) => {
									const key: string = element.name.slice(prefix.length+1);
									dsConfig.entries.set(key, element.value);
								});
								const oldLen: number = dvConfig.spec.env.length;
								createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, f, eName, eValue)
									.then( (created) => {
										if (created) {
											dvConfig.spec.env.length.should.equal(oldLen+1);
											should.exist(dvConfig.spec.env.find( (element) => {
												return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, eName) && element.value === eValue;
											}));
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
			if (fs.existsSync(f)) {
				fs.unlinkSync(f);
			}
		});

		it('should return true when modifying a datasource entry with valid parameters', (done) => {
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const oldLen: number = dvConfig.spec.env.length;
			const newVal: string = 'XYZVALUE';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, f, eName, newVal)
				.then( (success) => {
					if (success) {
						dvConfig.spec.env.length.should.equal(oldLen);
						should.exist(dvConfig.spec.env.find( (element) => {
							return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, eName) && element.value === newVal;
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const oldLen: number = dvConfig.spec.env.length;
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, f, eName, newVal)
				.then( (success) => {
					if (success) {
						dvConfig.spec.env.length.should.equal(oldLen);
						should.exist(dvConfig.spec.env.find( (element) => {
							return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, eName) && element.value === newVal;
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(undefined, dsConfig, f, eName, newVal)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, undefined, f, eName, newVal)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, undefined, eName, newVal)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, f, undefined, newVal)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const newVal: string = '';
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, f, 'NOT_EXISTING', newVal)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			editDSEntryCommand.handleDataSourceEntryEdit(dvConfig, dsConfig, f, eName, undefined)
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
		const eName: string = 'NEWKEY';
		const eValue: string = 'NEWVALUE';

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

								const dsConfig: IDataSourceConfig = {
									name: dsName,
									type: mongoDSType,
									entries: new Map()
								};
								dvConfig.spec.env.forEach( (element: IEnv) => {
									const key: string = element.name.slice(prefix.length+1);
									dsConfig.entries.set(key, element.value);
								});
								const oldLen: number = dvConfig.spec.env.length;
								createDSEntryCommand.handleDataSourceEntryCreation(dvConfig, dsConfig, f, eName, eValue)
									.then( (created) => {
										if (created) {
											dvConfig.spec.env.length.should.equal(oldLen+1);
											should.exist(dvConfig.spec.env.find( (element) => {
												return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, eName) && element.value === eValue;
											}));
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
			if (fs.existsSync(f)) {
				fs.unlinkSync(f);
			}
		});

		it('should return true when modifying a datasource entry with valid parameters', (done) => {
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			const oldLen: number = dvConfig.spec.env.length;
			deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, f, eName)
				.then( (success) => {
					if (success) {
						dvConfig.spec.env.length.should.equal(oldLen-1);
						should.not.exist(dvConfig.spec.env.find( (element) => {
							return element.name === utils.generateFullDataSourceConfigEntryKey(dsConfig, eName);
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			deleteDSEntryCommand.handleDataSourceEntryDeletion(undefined, dsConfig, f, eName)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, undefined, f, eName)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, undefined, eName)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, f, undefined)
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
			const dvConfig: IDVConfig = utils.loadModelFromFile(f);
			const dsConfig: IDataSourceConfig = {
				name: dsName,
				type: mongoDSType,
				entries: new Map()
			};
			dvConfig.spec.env.forEach( (element: IEnv) => {
				const key: string = element.name.slice(prefix.length+1);
				dsConfig.entries.set(key, element.value);
			});
			deleteDSEntryCommand.handleDataSourceEntryDeletion(dvConfig, dsConfig, f, 'NOT_EXISTING')
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
