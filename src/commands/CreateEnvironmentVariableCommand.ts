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

const CREATE_NEW_ENTRY: string = 'New...';

export async function createEnvironmentVariableCommandForValue(envNode: EnvironmentTreeNode) {
	if (envNode) {
		const variableName: string = await queryVariableName(envNode);
		if (variableName === undefined) {
			return;
		}

		const variableValue:string = await vscode.window.showInputBox( { placeHolder: 'Enter the value of the new variable' });
		if (variableValue === undefined) {
			return;
		}

		const yaml: DataVirtConfig = envNode.getProject().dvConfig;
		const file: string = envNode.getProject().file;
		const success: boolean = await handleEnvironmentVariableCreation(yaml, envNode.environment, file, constants.REFERENCE_TYPE_VALUE, variableName, variableValue);
		if (success) {
			vscode.window.showInformationMessage(`New environment variable ${variableName} has been created successfully...`);
		} else {
			vscode.window.showErrorMessage(`An error occured when trying to create a new environment variable ${variableName}...`);
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
		const yaml: DataVirtConfig = envNode.getProject().dvConfig;
		const file: string = envNode.getProject().file;

		const refName: string = await vscode.window.showInputBox( { validateInput: utils.ensureValueIsNotEmpty, placeHolder: 'Enter the name of the reference' });
		if (refName === undefined) {
			return;
		}

		let variableName: string;
		let variableValue: string;
		if(utils.doesLocalReferenceFileExist(file, refName, type)) {
			const predefinedVariables = utils.loadPredefinedVariables(file, refName, type);

			const variable: Property = await queryVariable(envNode, predefinedVariables);
			if (variable === undefined) {
				return;
			} else {
				variableName = variable.name;
				variableValue = variable.value;
			}
		} else {
			variableName = await queryVariableName(envNode);
		}

		variableValue = await vscode.window.showInputBox( { placeHolder: 'Enter the value of the new variable', value: variableValue ? variableValue : '' });
		if (variableValue === undefined) {
			return;
		}

		const success: boolean = await handleEnvironmentVariableCreation(yaml, envNode.environment, file, type, variableName, variableValue, refName);
		if (success) {
			vscode.window.showInformationMessage(`New environment variable ${variableName} has been created successfully...`);
		} else {
			vscode.window.showErrorMessage(`An error occured when trying to create a new environment variable ${variableName}...`);
		}
	}
}

export function handleEnvironmentVariableCreation(dvConfig: DataVirtConfig, environment: Property[], file: string, variableType: string, variableName: string, variableValue: string, refName?: string): Promise<boolean> {
	return new Promise<boolean>( async (resolve) => {
		if (dvConfig && variableType && environment && file && variableName) {
			try {
				const entry: Property = utils.getEnvironmentVariableByName(variableName, environment);
				if (!entry) {
					setEnvironmentVariableValue(environment, variableType, variableName, variableValue, refName);
					utils.createOrUpdateLocalReferenceFile(refName, variableName, variableValue, variableType);
					await utils.saveModelToFile(dvConfig, file);
					resolve(true);
				} else {
					resolve(false);
				}
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log(`handleEnvironmentVariableCreation: Unable to create the environment variable ${variableName ? variableName : '<Unknown>'}...`);
			resolve(false);
		}
	});
}

function setEnvironmentVariableValue(entries: Property[], variableType: string, variableName: string, variableValue: string, refName?: string): void {
	let variable: Property;
	if (variableType === constants.REFERENCE_TYPE_SECRET) {
		const secretRef = new SecretRef(new KeyRef(refName, variableName));
		variable = new Property(variableName, undefined, secretRef);
	} else if (variableType === constants.REFERENCE_TYPE_CONFIGMAP) {
		const configMapRef = new ConfigMapRef(new KeyRef(refName, variableName));
		variable = new Property(variableName, undefined, configMapRef);
	} else {
		variable = new Property(variableName, variableValue, undefined);
	}
	entries.push(variable);
}

async function queryVariable(envNode: EnvironmentTreeNode, predefinedVariables: Array<Property>): Promise<Property | undefined> {
	const names: string[] = new Array<string>();
	names.push(CREATE_NEW_ENTRY);

	predefinedVariables.forEach( (variable: Property) => {
		names.push(variable.name);
	});

	const selectedVariableName: string = await vscode.window.showQuickPick(names, { canPickMany: false, placeHolder: `Select a variable from the list or "New..." to create a new one` });
	if (!selectedVariableName) {
		return undefined;
	}

	if (selectedVariableName === CREATE_NEW_ENTRY) {
		const variableName: string = await queryVariableName(envNode);
		if (variableName === undefined) {
			return;
		}
		return new Property(variableName, '', undefined);
	} else {
		return predefinedVariables.find( (value: Property) => {
			return value.name === selectedVariableName;
		});
	}
}

async function queryVariableName(envNode: EnvironmentTreeNode): Promise<string | undefined> {
	return await vscode.window.showInputBox( { validateInput: (value: string) => {
		if(utils.getEnvironmentVariableByName(value, envNode.environment)) {
			return `There is already an environment variable with the name ${value}.`;
		}
		return utils.ensureValidEnvironmentVariableName(value);
	}, placeHolder: 'Enter the name of the new variable' });
}
