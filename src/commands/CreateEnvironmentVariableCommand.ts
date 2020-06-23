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
import { DataVirtConfig, Property } from '../model/DataVirtModel';
import { EnvironmentTreeNode } from '../model/tree/EnvironmentTreeNode';

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

export function handleEnvironmentVariableCreation(dvConfig: DataVirtConfig, environment: Property[], file: string, variableType: string, variableName: string, variableValue: string): Promise<boolean> {
	return new Promise<boolean>( async (resolve) => {
		if (dvConfig && variableType && environment && file && variableName) {
			try {
				const entry: Property = utils.getEnvironmentVariableByName(variableName, environment);
				if (!entry) {
					environment.push(new Property(variableName, variableValue, undefined));
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

async function queryVariableName(envNode: EnvironmentTreeNode): Promise<string | undefined> {
	return await vscode.window.showInputBox( { validateInput: (value: string) => {
		if(utils.getEnvironmentVariableByName(value, envNode.environment)) {
			return `There is already an environment variable with the name ${value}.`;
		}
		return utils.ensureValidEnvironmentVariableName(value);
	}, placeHolder: 'Enter the name of the new variable' });
}
