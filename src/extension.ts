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
import * as path from 'path';
import * as fs from 'fs';
import { DataVirtNodeProvider } from './model/tree/DataVirtNodeProvider';
import { IDataSourceConfig } from './model/DataVirtModel';
import { SchemaTreeNode } from './model/tree/SchemaTreeNode';
import { MongoDBDataSource } from './model/datasources/MongoDBDataSource';
import { SalesForceDataSource } from './model/datasources/SalesForceDataSource';
import { GoogleSheetsDataSource } from './model/datasources/GoogleSheetsDataSource';
import { RestBasedDataSource } from './model/datasources/RestBasedDataSource';
import { createVDBCommand } from './commands/CreateVDBCommand';
import { createDataSourceCommand } from './commands/CreateDataSourceCommand';
import { deleteDataSourceCommand } from './commands/DeleteDataSourceCommand';
import { createDataSourceEntryCommand } from './commands/CreateDataSourceEntryCommand';
import { editDataSourceEntryCommand } from './commands/EditDataSourceEntryCommand';
import { deleteDataSourceEntryCommand } from './commands/DeleteDataSourceEntryCommand';
import { editSchemaCommand, handleSaveDDL } from './commands/EditSchemaCommand';
import { deployVDBCommand } from './commands/DeployVDBCommand';
import { undeployVDBCommand } from './commands/UndeployVDBCommand';
import * as languageServer from './languageServer';

export let dataVirtProvider : DataVirtNodeProvider;
export let pluginResourcesPath: string;
export let workspaceReady : boolean = true;
export const DDL_FILE_EXT: string = '.ddl';
export const TEMPLATE_NAME: string = '$!TEMPLATE!$';
export const DDL_NAME_PLACEHOLDER: string = '$!VDB_NAME_PLACEHOLDER!$';
export const DATASOURCE_TYPES: Map<string, IDataSourceConfig> = new Map();

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

	vscode.window.onDidChangeVisibleTextEditors(handleVisibleEditorChanges);

	vscode.workspace.onWillSaveTextDocument( (event) => {
		event.waitUntil(handleSaveDDL(event));
	});

	pluginResourcesPath = context.asAbsolutePath('resources');

	// register the commands
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.create.vdb', createVDBCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.create.datasource', createDataSourceCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.delete.datasource', deleteDataSourceCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.create.datasourceentry', createDataSourceEntryCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.edit.datasourceentry', editDataSourceEntryCommand));
	context.subscriptions.push(vscode.commands.registerCommand('datavirt.delete.datasourceentry', deleteDataSourceEntryCommand));
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
			await dataVirtProvider.refresh().catch((err) => console.log(err));
		}
	});
}

function handleVisibleEditorChanges(event) {
	let k: string;
	for( const [key, value] of fileToEditor) {
		if (event.indexOf(value) === -1) {
			const p = path.dirname(key);
			if (fileToNode.has(key)) {
				fs.unlinkSync(key);
				fs.rmdirSync(p);
			}
			k = key;
		}
	}
	fileToEditor.delete(k);
	fileToNode.delete(k);
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
	DATASOURCE_TYPES.set('MongoDB', new MongoDBDataSource(TEMPLATE_NAME));
	DATASOURCE_TYPES.set('Salesforce', new SalesForceDataSource(TEMPLATE_NAME));
	DATASOURCE_TYPES.set('Google Sheets', new GoogleSheetsDataSource(TEMPLATE_NAME));
	DATASOURCE_TYPES.set('Rest Based', new RestBasedDataSource(TEMPLATE_NAME));
}
