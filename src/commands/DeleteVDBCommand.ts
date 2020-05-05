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
import * as util from 'util';
import * as utils from '../utils';
import * as vscode from 'vscode';
import { DVProjectTreeNode } from '../model/tree/DVProjectTreeNode';

const unlinkFile = util.promisify(fs.unlink);

export async function deleteVDBCommand(dvProjectNode: DVProjectTreeNode): Promise<void> {
	const success: boolean = await handleVDBDeletion(dvProjectNode.label, dvProjectNode.file);
	if (success) {
		utils.closeOpenEditorsIfRequired(dvProjectNode.file);
		vscode.window.showInformationMessage(`Virtual database ${dvProjectNode.label} has been deleted...`);
	} else {
		vscode.window.showErrorMessage(`An error occured when trying to delete the virtual database ${dvProjectNode.label}...`);
	}
}

export async function handleVDBDeletion(vdbName: string, file: string): Promise<boolean> {
	if (vdbName && file) {
		try {
			await unlinkFile(file);
			return true;
		} catch (error) {
			extension.log(error);
		}
	} else {
		extension.log(`handleVDBDeletion: Unable to delete the virtual database [${vdbName}] with file [${file}]...`);
	}
	return false;
}
