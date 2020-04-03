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
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as utils from '../utils';
import * as extension from '../extension';
import { SchemaTreeNode } from '../model/tree/SchemaTreeNode';
import { SchemasTreeNode } from '../model/tree/SchemasTreeNode';

export function editSchemaCommand(ctx) {
	let sNode: SchemasTreeNode;
	let ddlNode: SchemaTreeNode;

	if (ctx instanceof SchemasTreeNode) {
		sNode = ctx;
	} else if (ctx instanceof SchemaTreeNode) {
		ddlNode = ctx;
		sNode = ddlNode.getParent();
	} else {
		extension.log(`Unsupported type for schema modification: ${ctx}`);
		return;
	}
	if (sNode && sNode.children && sNode.children.length>0) {
		if (!ddlNode) {
			ddlNode = sNode.children[0] as SchemaTreeNode;
		}
		const sql: string = ddlNode.getDDL();
		const p = fs.mkdtempSync(`${vscode.workspace.rootPath}${path.sep}.tmp_`, 'utf-8');
		const tempFile = path.join(p, `${sNode.getProject().label}${extension.DDL_FILE_EXT}`);
		fs.writeFileSync(tempFile, sql);
		vscode.workspace.openTextDocument(tempFile)
			.then((a: vscode.TextDocument) => {
				vscode.window.showTextDocument(a, 1, true)
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
