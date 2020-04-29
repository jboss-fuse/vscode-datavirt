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
import * as constants from '../constants';
import * as extension from '../extension';
import * as utils from '../utils';
import * as vscode from 'vscode';
import { DataVirtConfig, ConfigMapRef, SecretRef, Property, KeyRef } from '../model/DataVirtModel';
import { EnvironmentTreeNode } from '../model/tree/EnvironmentNode';

export async function createEnvironmentVariableCommandForValue(envNode: EnvironmentTreeNode) {
	if (envNode) {
		let entryName: string = await queryVariableName(envNode);
		if (entryName === undefined) {
			return;
		}

		let entryValue:string = await vscode.window.showInputBox( { placeHolder: 'Enter the value of the new variable' });
		if (entryValue === undefined) {
			return;
		}

		const yaml: DataVirtConfig = envNode.getProject().dvConfig;
		const file: string = envNode.getProject().file;
		let success: boolean = await handleEnvironmentVariableCreation(yaml, envNode.environment, file, constants.REFERENCE_TYPE_VALUE, entryName, entryValue);
		if (success) {
			vscode.window.showInformationMessage(`New environment variable ${entryName} has been created successfully...`);
		} else {
			vscode.window.showErrorMessage(`An error occured when trying to create a new environment variable ${entryName}...`);
		}
	}
}

export async function createEnvironmentVariableCommandForSecret(envNode: EnvironmentTreeNode) {
	await createEnvironmentVariableCommandForReference(envNode, constants.REFERENCE_TYPE_SECRET);
}

export async function createEnvironmentVariableCommandForConfigMap(envNode: EnvironmentTreeNode) {
	await createEnvironmentVariableCommandForReference(envNode, constants.REFERENCE_TYPE_CONFIGMAP);
}

async function createEnvironmentVariableCommandForReference(envNode: EnvironmentTreeNode, type: string) {
	if (envNode) {
		let entryName: string = await queryVariableName(envNode);
		if (entryName === undefined) {
			return;
		}

		let refName: string = await vscode.window.showInputBox( { validateInput: utils.ensureValueIsNotEmpty, placeHolder: 'Enter the name of the reference' });
		if (refName === undefined) {
			return;
		}

		let refKey: string = await vscode.window.showInputBox( { validateInput: utils.ensureValueIsNotEmpty, placeHolder: 'Enter the key for the reference' });
		if (refKey === undefined) {
			return;
		}

		let entryValue:string = await vscode.window.showInputBox( { placeHolder: 'Enter the value of the new variable' });
		if (entryValue === undefined) {
			return;
		}

		const yaml: DataVirtConfig = envNode.getProject().dvConfig;
		const file: string = envNode.getProject().file;
		let success: boolean = await handleEnvironmentVariableCreation(yaml, envNode.environment, file, type, entryName, entryValue, refName, refKey);
		if (success) {
			vscode.window.showInformationMessage(`New environment variable ${entryName} has been created successfully...`);
		} else {
			vscode.window.showErrorMessage(`An error occured when trying to create a new environment variable ${entryName}...`);
		}
	}
}


export function handleEnvironmentVariableCreation(dvConfig: DataVirtConfig, enviroment: Property[], file: string, entryType: string, entryName: string, entryValue: string, refName?: string, refKey?: string): Promise<boolean> {
	return new Promise<boolean>( (resolve) => {
		if (dvConfig && entryType && enviroment && file && entryName) {
			try {
				const entry: Property = utils.getEnvironmentVariableByName(entryName, enviroment);
				if (!entry) {
					setEnvironmentVariableValue(enviroment, entryType, entryName, entryValue, refName, refKey);
					utils.createOrUpdateLocalReferenceFile(refName, refKey, entryValue, entryType);
					utils.saveModelToFile(dvConfig, file);
					resolve(true);
				} else {
					resolve(false);
				}
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log(`handleEnvironmentVariableCreation: Unable to create the environment variable ${entryName ? entryName : '<Unknown>'}...`);
			resolve(false);
		}
	});
}

function setEnvironmentVariableValue(entries: Property[], entryType: string, entryName: string, entryValue: string, refName?: string, refKey?: string): void {
	let entry: Property;
	if (entryType === constants.REFERENCE_TYPE_SECRET) {
		const secretRef = new SecretRef(new KeyRef(refName, refKey));
		entry = new Property(entryName, undefined, secretRef);
	} else if (entryType === constants.REFERENCE_TYPE_CONFIGMAP) {
		const configMapRef = new ConfigMapRef(new KeyRef(refName, refKey));
		entry = new Property(entryName, undefined, configMapRef);
	} else {
		entry = new Property(entryName, entryValue, undefined);
	}
	entries.push(entry);
}

async function queryVariableName(envNode: EnvironmentTreeNode): Promise<string | undefined> {
	return await vscode.window.showInputBox( { validateInput: (value: string) => {
		if(utils.getEnvironmentVariableByName(value, envNode.environment)) {
			return `There is already an environment variable with the name ${value}.`;
		}
		return utils.ensureValidEnvironmentVariableName(value);
	}, placeHolder: 'Enter the name of the new variable' });
}
