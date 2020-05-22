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
import * as extension from '../extension';
import * as utils from '../utils';
import * as vscode from 'vscode';
import { SchemaTreeNode } from '../model/tree/SchemaTreeNode';
import { VDBFileInfo } from '../model/DataVirtModel';

export async function editSchemaCommand(ddlNode: SchemaTreeNode) {
	const infoObject: VDBFileInfo = extension.openedDocuments.find( (element: VDBFileInfo) => {
		return element.vdbFilePath === ddlNode.getProject().file;
	});
	if (infoObject) {
		vscode.window.showTextDocument(infoObject.openEditor.document);
	} else {
		const sql: string = ddlNode.getDDL();
		const tempFile = await utils.createTempFile(ddlNode.getProject().label, sql);
		const textDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(tempFile);
		const editor: vscode.TextEditor = await vscode.window.showTextDocument(textDocument, vscode.ViewColumn.Active, false);
		extension.openedDocuments.push( {
			ddlNode: ddlNode,
			openEditor: editor,
			tempSQLFilePath: tempFile,
			vdbFilePath: ddlNode.getProject().file,
			vdbName: ddlNode.getProject().label
		});
	}
}

export function handleSaveDDL(event: vscode.TextDocumentWillSaveEvent): Promise<void> {
	return new Promise<void>( async (resolve, reject) => {
		const fileName: string = event.document.fileName;
		const ddl: string = event.document.getText();
		const infoObject: VDBFileInfo = extension.openedDocuments.find( (element: VDBFileInfo) => {
			return element.tempSQLFilePath === fileName;
		});
		if (infoObject && infoObject.ddlNode) {
			infoObject.ddlNode.getProject().dvConfig.spec.build.source.ddl = ddl;
			await (utils.saveModelToFile(infoObject.ddlNode.getProject().dvConfig, infoObject.vdbFilePath));
			resolve();
		} else {
			reject();
		}
	});
}
