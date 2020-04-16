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
import * as fs from 'fs';
import * as path from 'path';
import * as utils from '../utils';
import * as vscode from 'vscode';
import { SchemaTreeNode } from '../model/tree/SchemaTreeNode';

export function editSchemaCommand(ddlNode: SchemaTreeNode) {
	const sql: string = ddlNode.getDDL();
	const tempFile = extension.createTempFile(ddlNode.getProject().label, sql);
	vscode.workspace.openTextDocument(tempFile)
		.then((textDocument: vscode.TextDocument) => {
			vscode.window.showTextDocument(textDocument, 1, true)
				.then( (editor: vscode.TextEditor) => {
					if (extension.fileToNode.has(tempFile)) {
						for ( const [key, value] of extension.fileToNode) {
							if (value === ddlNode) {
								fs.unlinkSync(key);
								fs.rmdirSync(path.dirname(key));
							}
						}
					}
					extension.fileToNode.set(tempFile, ddlNode);
					extension.fileToEditor.set(tempFile, editor);
				});
		});
}

export function handleSaveDDL(event: vscode.TextDocumentWillSaveEvent): Promise<void> {
	return new Promise<void>( (resolve, reject) => {
		const fileName: string = event.document.fileName;
		const ddl: string = event.document.getText();
		const sNode: SchemaTreeNode = extension.fileToNode.get(fileName);
		if (sNode) {
			sNode.getProject().dvConfig.spec.build.source.ddl = ddl;
			utils.saveModelToFile(sNode.getProject().dvConfig, sNode.getProject().getFile());
			resolve();
			return;
		}
		reject();
	});
}
