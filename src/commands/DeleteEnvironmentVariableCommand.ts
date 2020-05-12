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
import { DataVirtConfig, Property } from '../model/DataVirtModel';
import { EnvironmentVariableTreeNode } from '../model/tree/EnvironmentVariableTreeNode';

export function deleteEnvironmentVariableCommand(envVarTreeNode: EnvironmentVariableTreeNode) {
	const dvConfig: DataVirtConfig = envVarTreeNode.getProject().dvConfig;
	const file: string = envVarTreeNode.getProject().getFile();
	const key: string = envVarTreeNode.getKey();

	handleEnvironmentVariableDeletion(dvConfig, file, key)
		.then( (success: boolean) => {
			if (success) {
				vscode.window.showInformationMessage(`Environment variable ${key} has been deleted...`);
			} else {
				vscode.window.showErrorMessage(`An error occured when trying to delete the environment variable ${key}...`);
			}
		});
}

export function handleEnvironmentVariableDeletion(dvConfig: DataVirtConfig, file: string, key: string): Promise<boolean> {
	return new Promise<boolean>( async (resolve) => {
		if (dvConfig && file && key) {
			try {
				let deleted: boolean = false;
				const idx: number = dvConfig.spec.env.findIndex( (value: Property) => {
					return value.name === key;
				});
				if (idx !== -1) {
					dvConfig.spec.env.splice(idx, 1);
					deleted = true;
				}
				if (deleted) {
					await utils.saveModelToFile(dvConfig, file);
				}
				resolve(deleted);
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log(`handleEnvironmentVariableDeletion: Unable to delete the environment variable ${key}...`);
			resolve(false);
		}
	});
}
