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
import * as vscode from 'vscode';
import { DVProjectTreeNode } from '../model/tree/DVProjectTreeNode';

export function deleteVDBCommand(dvProjectNode: DVProjectTreeNode): void {
	if (dvProjectNode) {
		handleVDBDeletion(dvProjectNode.label, dvProjectNode.file)
			.then( (success: boolean) => {
				if (success) {
					vscode.window.showInformationMessage(`VDB ${dvProjectNode.label} has been deleted...`);
				} else {
					vscode.window.showErrorMessage(`An error occured when trying to delete the VDB ${dvProjectNode.label}...`);
				}
		});
	}
}

export function handleVDBDeletion(vdbName: string, file: string): Promise<boolean> {
	return new Promise<boolean>( (resolve) => {
		if (vdbName && file) {
			try {
				fs.unlinkSync(file);
				resolve(true);
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log(`handleVDBDeletion: Unable to delete the VDB ${vdbName}...`);
			resolve(false);
		}
	});
}
