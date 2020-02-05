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
"use strict";

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as utils from './utils';
import { DataVirtNodeProvider } from './model/tree/DataVirtNodeProvider';
import { IDVConfig, IDataSourceConfig, IEnv } from './model/DataVirtModel';
import { DataSourceTreeNode } from './model/tree/DataSourceTreeNode';
import { DataSourceConfigEntryTreeNode } from './model/tree/DataSourceConfigEntryTreeNode';
import { SchemaTreeNode } from './model/tree/SchemaTreeNode';
import { SpringDataSource } from './model/datasources/SpringDataSource';
import { MongoDBDataSource } from './model/datasources/MongoDBDataSource';
import { SalesForceDataSource } from './model/datasources/SalesForceDataSource';
import { GoogleSheetsDataSource } from './model/datasources/GoogleSheetsDataSource';
import { RestBasedDataSource } from './model/datasources/RestBasedDataSource';

let dataVirtExtensionOutputChannel: vscode.OutputChannel;
let dataVirtTreeView : vscode.TreeView<vscode.TreeItem>;
let dataVirtProvider : DataVirtNodeProvider;
let pluginResourcesPath: string;

let fileToNode: Map<string, SchemaTreeNode> = new Map();
let fileToEditor: Map<string, vscode.TextEditor> = new Map();

export const TEMPLATE_NAME: string = '$!TEMPLATE!$';
export const DATASOURCE_TYPES: Map<string, IDataSourceConfig> = new Map();

export function activate(context: vscode.ExtensionContext) {

	DATASOURCE_TYPES.set('SpringBoot', new SpringDataSource(TEMPLATE_NAME));
	DATASOURCE_TYPES.set('MongoDB', new MongoDBDataSource(TEMPLATE_NAME));
	DATASOURCE_TYPES.set('Salesforce', new SalesForceDataSource(TEMPLATE_NAME));
	DATASOURCE_TYPES.set('Google Sheets', new GoogleSheetsDataSource(TEMPLATE_NAME));
	DATASOURCE_TYPES.set('Rest Based', new RestBasedDataSource(TEMPLATE_NAME));

	dataVirtProvider = new DataVirtNodeProvider(vscode.workspace.rootPath, context);
	creatDataVirtView();

	vscode.window.onDidChangeVisibleTextEditors( event => {
		let k: string;
		for( let [key, value] of fileToEditor) {
			if (event.indexOf(value) === -1) {
				let p = path.dirname(key);
				if (fileToNode.has(key)) {
					fs.unlinkSync(key);
					fs.rmdirSync(p);
				}
				k = key;
			}
		}
		fileToEditor.delete(k);
		fileToNode.delete(k);
	});

	vscode.workspace.onWillSaveTextDocument(event => {
		event.waitUntil(handleSaveDDL(event));
	});

	pluginResourcesPath = context.asAbsolutePath('resources');

	context.subscriptions.push(vscode.commands.registerCommand('datavirt.create.vdb', (ctx) => {
		vscode.window.showInputBox( {placeHolder: "Enter the name of the new VDB config"})
			.then( (fileName: string) => {
				handleVDBCreation(vscode.workspace.rootPath, fileName)
					.then( (success: boolean) => {
						if (success) {
							vscode.window.showInformationMessage(`New VDB ${fileName} has been created successfully...`);
						} else {
							vscode.window.showErrorMessage(`An error occured when trying to create a new VDB...`);
						}
					});
			});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('datavirt.create.datasource', (ctx) => {
		vscode.window.showInputBox( {placeHolder: "Enter the name of the new datasource"})
			.then( async (dsName: string) => {
				await vscode.window.showQuickPick( Array.from(DATASOURCE_TYPES.keys()), {canPickMany: false, placeHolder: "Select the datasource type" })
					.then( (dsType: string) => {
						handleDataSourceCreation(ctx, dsName, dsType)
							.then( (success: boolean) => {
								if (success) {
									vscode.window.showInformationMessage(`New datasource ${dsName} has been created successfully...`);
								} else {
									vscode.window.showErrorMessage(`An error occured when trying to create a new datasource...`);
								}
							});
					});
			});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('datavirt.edit.datasource', (ctx) => {
		let ds: DataSourceTreeNode = ctx;
		vscode.window.showInputBox( {value: ds.getKey().split(' ')[0]})
			.then( async (dsName: string) => {
				await vscode.window.showQuickPick( Array.from(DATASOURCE_TYPES.keys()), {canPickMany: false, placeHolder: ds.type })
					.then( (dsType: string) => {
						handleDataSourceEdit(ctx, dsName, dsType)
							.then( (success: boolean) => {
								if (success) {
									vscode.window.showInformationMessage(`DataSource has been modified...`);
								} else {
									vscode.window.showErrorMessage(`An error occured when trying to modify the datasource...`);
								}
							});
					});
			});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('datavirt.delete.datasource', (ctx) => {
		handleDataSourceDeletion(ctx)
			.then( (success: boolean) => {
				if (success) {
					vscode.window.showInformationMessage(`DataSource has been deleted...`);
				} else {
					vscode.window.showErrorMessage(`An error occured when trying to delete the datasource...`);
				}
			});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('datavirt.create.datasourceentry', (ctx) => {
		vscode.window.showInputBox( {placeHolder: "Enter the name of the new entry"})
			.then( (eName: string) => {
				vscode.window.showInputBox( {placeHolder: "Enter the value of the new entry"})
					.then( (eValue: string) => {
						handleDataSourceEntryCreation(ctx, eName, eValue)
							.then( (success: boolean) => {
								if (success) {
									vscode.window.showInformationMessage(`New datasource entry ${eName} has been created successfully...`);
								} else {
									vscode.window.showErrorMessage(`An error occured when trying to create a new datasource entry...`);
								}
							});
					});
			});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('datavirt.edit.datasourceentry', (ctx) => {
		let item: DataSourceConfigEntryTreeNode = ctx;
		vscode.window.showInputBox( {value: item.getValue()})
			.then( ( newValue: string) => {
				handleDataSourceEntryEdit(ctx, item, newValue)
					.then( (success: boolean) => {
						if (success) {
							vscode.window.showInformationMessage(`DataSource entry has been modified...`);
						} else {
							vscode.window.showErrorMessage(`An error occured when trying to modify the datasource entry...`);
						}
					});
			});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('datavirt.delete.datasourceentry', (ctx) => {
		handleDataSourceEntryDeletion(ctx)
			.then( (success: boolean) => {
				if (success) {
					vscode.window.showInformationMessage(`DataSource entry has been deleted...`);
				} else {
					vscode.window.showErrorMessage(`An error occured when trying to delete the datasource entry...`);
				}
			});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('datavirt.edit.schema', (ctx) => {
		let sNode: SchemaTreeNode = ctx;
		let sql: string = sNode.getDDL();
		let p = fs.mkdtempSync(`${vscode.workspace.rootPath}${path.sep}.tmp_`, 'utf-8');
		let tempFile = path.join(p, `${sNode.getProject().label}.sql`);
		fs.writeFileSync(tempFile, sql);
		vscode.workspace.openTextDocument(tempFile)
			.then((a: vscode.TextDocument) => {
				vscode.window.showTextDocument(a, 1, true)
					.then( (editor: vscode.TextEditor) => {
						if (fileToNode.has(tempFile)) {
							for ( let [key, value] of fileToNode) {
								if (value === sNode) {
									fs.unlinkSync(key);
									fs.rmdirSync(path.dirname(key));
								}
							}
						}
						fileToNode.set(tempFile, sNode);
						fileToEditor.set(tempFile, editor);
					});
			});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('datavirt.deploy', (ctx) => {
		let file: string;
		if (ctx && ctx.fsPath) {
			file = ctx.fsPath;
		} else {
			file = undefined;
		}

		handleDeploy(file);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('datavirt.undeploy', (ctx) => {
		let file: string;
		if (ctx && ctx.fsPath) {
			file = ctx.fsPath;
		} else {
			file = undefined;
		}

		handleUndeploy(file);
	}));
}

export function deactivate(context: vscode.ExtensionContext) {
	disposeExtensionOutputChannel();
}

export function log(text) {
	if (!dataVirtExtensionOutputChannel) {
		dataVirtExtensionOutputChannel = vscode.window.createOutputChannel("DataVirt Extension");
	}
	dataVirtExtensionOutputChannel.show();
	dataVirtExtensionOutputChannel.append(text.toString());
}

/* Used for testing purpose only*/
export function disposeExtensionOutputChannel() {
	if (dataVirtExtensionOutputChannel) {
		dataVirtExtensionOutputChannel.hide();
		dataVirtExtensionOutputChannel.dispose();
		dataVirtExtensionOutputChannel = undefined;
	}
}

function creatDataVirtView(): void {
	dataVirtTreeView = vscode.window.createTreeView('datavirt', {
		treeDataProvider: dataVirtProvider
	});
	dataVirtTreeView.onDidChangeVisibility(async () => {
		if (dataVirtTreeView.visible === true) {
			await dataVirtProvider.refresh().catch(err => console.log(err));
		}
	});
}

function handleVDBCreation(filepath: string, fileName: string): Promise<boolean> {
	return new Promise<boolean>( (resolve, reject) => {
		if (fileName && fileName.length>0) {
			try {
				let templatePath = path.join(pluginResourcesPath, "vdb_template.yaml");
				let targetFile: string = path.join(filepath, `${fileName}.yaml`);
				fs.copyFileSync(templatePath, targetFile);
				let yamlDoc:IDVConfig = utils.loadModelFromFile(targetFile);
				yamlDoc.metadata.name = fileName;
				utils.saveModelToFile(yamlDoc, targetFile);
				dataVirtProvider.refresh();
				resolve(true);
			} catch (error) {
				log(error);
				resolve(false);
			}
		} else {
			log("handleVDBCreation: Unable to create the VDB because no name was given...");
			resolve(false);
		}		
	});
}

function handleDataSourceCreation(ctx, dsName: string, dsType: string): Promise<boolean> {
	return new Promise<boolean>( (resolve, reject) => {
		if (dsName && dsType) {
			try {
				let yaml: IDVConfig = ctx.getProject().dvConfig;
				if (yaml) {
					let dsConfig: IDataSourceConfig = DATASOURCE_TYPES.get(dsType);
					dsConfig = utils.replaceTemplateName(dsConfig, dsName, TEMPLATE_NAME);
					utils.mapDSConfigToEnv(dsConfig, yaml);
					utils.saveModelToFile(yaml, ctx.getProject().getFile());
					dataVirtProvider.refresh();
					resolve(true);
				} else {
					resolve(false);
				}				
			} catch (error) {
				log(error);
				resolve(false);
			}
		} else {
			log("handleDataSourceCreation: Unable to create the datasource because no name and type were given...");
			resolve(false);
		}		
	});
}

function handleDataSourceEdit(ctx, dsName: string, dsType: string): Promise<boolean> {
	return new Promise<boolean>( (resolve, reject) => {
		if (ctx) {
			try {
				let ds: DataSourceTreeNode = ctx;
				let yaml: IDVConfig = ctx.getProject().dvConfig;
				if (yaml) {
					let dsConfig: IDataSourceConfig = ds.dsConfig;
					let oldPrefix: string = utils.generateDataSourceConfigPrefix(dsConfig);
					dsConfig.name = dsName;
					dsConfig.type = dsType;
					let newPrefix: string = utils.generateDataSourceConfigPrefix(dsConfig);
					yaml.spec.env.forEach( (element: IEnv) => {
						if (element.name.startsWith(`${oldPrefix}_`)) {
							element.name = element.name.replace(`${oldPrefix}_`, `${newPrefix}_`);
						}
					});
					utils.saveModelToFile(yaml, ds.getProject().getFile());
					dataVirtProvider.refresh();
					resolve(true);
				} else {
					resolve(false);
				}				
			} catch (error) {
				log(error);
				resolve(false);
			}
		} else {
			log("handleDataSourceEdit: Unable to modify the datasource...");
			resolve(false);
		}		
	});
}

function handleDataSourceDeletion(ctx): Promise<boolean> {
	return new Promise<boolean>( (resolve, reject) => {
		if (ctx) {
			try {
				let ds: DataSourceTreeNode = ctx;
				let dsConfig: IDataSourceConfig = ds.dsConfig;
				let yaml: IDVConfig = ds.getProject().dvConfig;
				let keys: IEnv[] = [];
				if (yaml) {
					yaml.spec.env.forEach( (element: IEnv) => {
						if (element.name.toUpperCase().startsWith(`${utils.generateDataSourceConfigPrefix(dsConfig).toUpperCase()}_`)) {
							keys.push(element);
						}
					});
					keys.forEach( (key) => {
						yaml.spec.env.splice(yaml.spec.env.indexOf(key, 1));
					});
					utils.saveModelToFile(yaml, ds.getProject().getFile());
					dataVirtProvider.refresh();
					resolve(true);
				} else {
					resolve(false);
				}	
			} catch (error) {
				log(error);
				resolve(false);
			}
		} else {
			log("handleDataSourceEdit: Unable to delete the datasource...");
			resolve(false);
		}		
	});
}

function handleDataSourceEntryCreation(ctx, eName: string, eValue: string): Promise<boolean> {
	return new Promise<boolean>( (resolve, reject) => {
		if (ctx) {
			try {
				let ds: DataSourceTreeNode = ctx;
				let yaml: IDVConfig = ctx.getProject().dvConfig;
				if (yaml) {
					let dsConfig: IDataSourceConfig = ds.dsConfig;
					if (!dsConfig.entries.has(eName)) {
						dsConfig.entries.set(eName, eValue);
					} else {
						resolve(false);
					}
					utils.mapDSConfigToEnv(dsConfig, yaml);
					utils.saveModelToFile(yaml, ctx.getProject().getFile());
					dataVirtProvider.refresh();
					resolve(true);
				} else {
					resolve(false);
				}				
			} catch (error) {
				log(error);
				resolve(false);
			}
		} else {
			log("handleDataSourceEdit: Unable to delete the datasource...");
			resolve(false);
		}		
	});
}

function handleDataSourceEntryEdit(ctx, item: DataSourceConfigEntryTreeNode, newValue: string): Promise<boolean> {
	return new Promise<boolean>( (resolve, reject) => {
		if (ctx) {
			try {
				let yaml: IDVConfig = item.getProject().dvConfig;
				if (yaml) {
					let dsP: DataSourceTreeNode = item.getParent();
					let dsConfig: IDataSourceConfig = dsP.dsConfig;
					dsConfig.entries.set(item.getKey(), newValue);
					utils.mapDSConfigToEnv(dsConfig, yaml);
					utils.saveModelToFile(yaml, ctx.getProject().getFile());
					dataVirtProvider.refresh();
					resolve(true);
				} else {
					resolve(false);
				}				
			} catch (error) {
				log(error);
				resolve(false);
			}
		} else {
			log("handleDataSourceEntryEdit: Unable to modify the datasource entry...");
			resolve(false);
		}		
	});
}

function handleDataSourceEntryDeletion(ctx): Promise<boolean> {
	return new Promise<boolean>( (resolve, reject) => {
		if (ctx) {
			try {
				let ds: DataSourceConfigEntryTreeNode = ctx;
				let dsConfig: IDataSourceConfig = ds.getParent().dsConfig;
				let yaml: IDVConfig = ds.getProject().dvConfig;
				if (yaml) {
					yaml.spec.env.forEach( (element: IEnv) => {
						if (element.name.toUpperCase() === utils.generateFullDataSourceConfigEntryKey(dsConfig, ds.getKey()).toUpperCase()) {
							yaml.spec.env.splice(yaml.spec.env.indexOf(element, 0), 1);
						}
					});
					utils.saveModelToFile(yaml, ds.getProject().getFile());
					dataVirtProvider.refresh();
					resolve(true);
				} else {
					resolve(false);
				}				
			} catch (error) {
				log(error);
				resolve(false);
			}
		} else {
			log("handleDataSourceEntryEdit: Unable to delete the datasource entry...");
			resolve(false);
		}		
	});
}

function handleSaveDDL(event: vscode.TextDocumentWillSaveEvent): Promise<void> {
	return new Promise<void>( (resolve, reject) => {
		let fileName: string = event.document.fileName;
		let ddl: string = event.document.getText();
		let sNode: SchemaTreeNode = fileToNode.get(fileName);
		if (sNode) {
			sNode.getProject().dvConfig.spec.build.source.ddl = ddl;
			utils.saveModelToFile(sNode.getProject().dvConfig, sNode.getProject().getFile());
			dataVirtProvider.refresh();
			resolve();
			return;
		}
		reject();
	});
}


function handleDeploy(filepath: string): void {
	log("\nDEPLOY: Selected File: " + filepath + "\n");
}

function handleUndeploy(filepath: string): void {
	log("\nUNDEPLOY: Selected File: " + filepath + "\n");
}
