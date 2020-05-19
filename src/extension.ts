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

import * as vscode from 'vscode';
import { AmazonS3DataSource } from './model/datasources/AmazonS3DataSource';
import * as constants from './constants';
import { convertDataSourceToSecret, convertDataSourceToConfigMap } from './commands/ConvertDataSourceCommand';
import { convertEnvironmentVariableToSecret, convertEnvironmentVariableToConfigMap } from './commands/ConvertEnvironmentVariableCommand';
import { createDataSourceCommand } from './commands/CreateDataSourceCommand';
import { createDataSourceEntryCommand } from './commands/CreateDataSourceEntryCommand';
import { createEnvironmentVariableCommandForValue } from './commands/CreateEnvironmentVariableCommand';
import { createVDBCommand } from './commands/CreateVDBCommand';
import { DataVirtNodeProvider } from './model/tree/DataVirtNodeProvider';
import { DataSourceConfig } from './model/DataVirtModel';
import { deleteDataSourceCommand } from './commands/DeleteDataSourceCommand';
import { deleteDataSourceEntryCommand } from './commands/DeleteDataSourceEntryCommand';
import { deleteEnvironmentVariableCommand } from './commands/DeleteEnvironmentVariableCommand';
import { deleteVDBCommand } from './commands/DeleteVDBCommand';
import { deployVDBCommand } from './commands/DeployVDBCommand';
import { editDataSourceEntryCommand } from './commands/EditDataSourceEntryCommand';
import { editEnvironmentVariableCommand } from './commands/EditEnvironmentVariableCommand';
import { editSchemaCommand, handleSaveDDL } from './commands/EditSchemaCommand';
import { FTPBasedDataSource } from './model/datasources/FTPBasedDataSource';
import { GoogleSheetsDataSource } from './model/datasources/GoogleSheetsDataSource';
import { InfinispanDataSource } from './model/datasources/InfinispanDataSource';
import * as languageServer from './languageServer';
import { MongoDBDataSource } from './model/datasources/MongoDBDataSource';
import { ODataBasedDataSource } from './model/datasources/ODataBasedDataSource';
import { OData4BasedDataSource } from './model/datasources/OData4BasedDataSource';
import { OpenAPIBasedDataSource } from './model/datasources/OpenAPIBasedDataSource';
import { RelationalDBDataSource } from './model/datasources/RelationalDBDataSource';
import { RestBasedDataSource } from './model/datasources/RestBasedDataSource';
import { SalesForceDataSource } from './model/datasources/SalesForceDataSource';
import { SAPGatewayBasedDataSource } from './model/datasources/SAPGatewayBasedDataSource';
import { SchemaTreeNode } from './model/tree/SchemaTreeNode';
import { undeployVDBCommand } from './commands/UndeployVDBCommand';

export const DATASOURCE_TYPES: Map<string, DataSourceConfig> = new Map();
export let dataVirtProvider : DataVirtNodeProvider;
export let pluginResourcesPath: string;
export let workspaceReady : boolean = true;
export let fileToNode: Map<string, SchemaTreeNode> = new Map();
export let fileToEditor: Map<string, vscode.TextEditor> = new Map();

let dataVirtExtensionOutputChannel: vscode.OutputChannel;
let dataVirtTreeView: vscode.TreeView<vscode.TreeItem>;
let fileSystemWatcher: vscode.FileSystemWatcher;

export function activate(context: vscode.ExtensionContext) {
	fillDataTypes();

	if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
		workspaceReady = false;
	}

	dataVirtProvider = new DataVirtNodeProvider(vscode.workspace.rootPath, context);
	creatDataVirtView();

	startFileSystemWatcher();

	vscode.workspace.onDidChangeWorkspaceFolders( () => {
		if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
			workspaceReady = true;
		} else {
			workspaceReady = false;
		}
	});

	vscode.workspace.onDidCloseTextDocument(handleClosedTextDocument);

	vscode.workspace.onWillSaveTextDocument( (event) => {
		event.waitUntil(handleSaveDDL(event));
	});

	pluginResourcesPath = context.asAbsolutePath('resources');

	// register the commands
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.create.vdb', createVDBCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.delete.vdb', deleteVDBCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.create.datasource', createDataSourceCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.delete.datasource', deleteDataSourceCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.datasource.convert.to.configmap', convertDataSourceToConfigMap));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.datasource.convert.to.secret', convertDataSourceToSecret));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.create.datasourceentry', createDataSourceEntryCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.edit.datasourceentry', editDataSourceEntryCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.delete.datasourceentry', deleteDataSourceEntryCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.create.envvar', createEnvironmentVariableCommandForValue));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.edit.envvar', editEnvironmentVariableCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.delete.envvar', deleteEnvironmentVariableCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.envvar.convert.to.configmap', convertEnvironmentVariableToConfigMap));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.envvar.convert.to.secret', convertEnvironmentVariableToSecret));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.edit.schema', editSchemaCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.deploy', deployVDBCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.undeploy', undeployVDBCommand));

	languageServer.activate(context);
}

export function deactivate(context: vscode.ExtensionContext) {
	disposeExtensionOutputChannel();
	fileSystemWatcher.dispose();
}

export function log(text) {
	if (!dataVirtExtensionOutputChannel) {
		dataVirtExtensionOutputChannel = vscode.window.createOutputChannel('DataVirt Extension');
	}
	dataVirtExtensionOutputChannel.show();
	dataVirtExtensionOutputChannel.append(`${text.toString()}\n`);
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
			await dataVirtProvider.refresh().catch((err) => console.log(err));
		}
	});
}

function handleClosedTextDocument(event) {
	const fileName: string = event.fileName;
	if (fileToEditor.has(fileName)) {
		vscode.workspace.fs.delete(vscode.Uri.file(fileName));
		fileToEditor.delete(fileName);
		fileToNode.delete(fileName);
	}
}

function startFileSystemWatcher(): void {
	fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.yaml');
	fileSystemWatcher.onDidCreate( () => {
		dataVirtProvider.refresh();
	});
	fileSystemWatcher.onDidDelete( () => {
		dataVirtProvider.refresh();
	});
	fileSystemWatcher.onDidChange( () => {
		dataVirtProvider.refresh();
	});
}

export function fillDataTypes(): void {
	DATASOURCE_TYPES.set('Amazon S3', new AmazonS3DataSource(constants.TEMPLATE_NAME));
	DATASOURCE_TYPES.set('FTP', new FTPBasedDataSource(constants.TEMPLATE_NAME));
	DATASOURCE_TYPES.set('Google Sheets', new GoogleSheetsDataSource(constants.TEMPLATE_NAME));
	DATASOURCE_TYPES.set('Infinispan', new InfinispanDataSource(constants.TEMPLATE_NAME));
	DATASOURCE_TYPES.set('MongoDB', new MongoDBDataSource(constants.TEMPLATE_NAME));
	DATASOURCE_TYPES.set('OData', new ODataBasedDataSource(constants.TEMPLATE_NAME));
	DATASOURCE_TYPES.set('OData4', new OData4BasedDataSource(constants.TEMPLATE_NAME));
	DATASOURCE_TYPES.set('OpenAPI', new OpenAPIBasedDataSource(constants.TEMPLATE_NAME));
	DATASOURCE_TYPES.set(constants.RELATIONAL_DB_KEY, new RelationalDBDataSource(constants.TEMPLATE_NAME));
	DATASOURCE_TYPES.set('Rest Based', new RestBasedDataSource(constants.TEMPLATE_NAME));
	DATASOURCE_TYPES.set('Salesforce', new SalesForceDataSource(constants.TEMPLATE_NAME));
	DATASOURCE_TYPES.set('SAP Gateway', new SAPGatewayBasedDataSource(constants.TEMPLATE_NAME));
}
