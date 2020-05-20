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
import { DataVirtConfig, Property, ConfigMapConfig, SecretConfig, ConfigMapRef, KeyRef, SecretRef } from '../model/DataVirtModel';
import { EnvironmentVariableTreeNode } from '../model/tree/EnvironmentVariableTreeNode';
import { EnvironmentTreeNode } from '../model/tree/EnvironmentNode';

export async function convertEnvironmentVariableToSecret(envVarNode: EnvironmentVariableTreeNode) {
	await convertEnvironmentVariable(envVarNode, constants.REFERENCE_TYPE_SECRET);
}

export async function convertEnvironmentVariableToConfigMap(envVarNode: EnvironmentVariableTreeNode) {
	await convertEnvironmentVariable(envVarNode, constants.REFERENCE_TYPE_CONFIGMAP);
}

async function convertEnvironmentVariable(envVarNode: EnvironmentVariableTreeNode, refType: string) {
	if(!envVarNode.isValueType()) {
		vscode.window.showWarningMessage(`Environment variable ${envVarNode.key} cannot be migrated to ${refType} because it is already a reference...`);
		return;
	}

	const refName: string = await vscode.window.showInputBox( { validateInput: utils.ensureValueIsNotEmpty, placeHolder: 'Enter the name of the new reference.'});
	if (refName === undefined) {
		return;
	}

	const dvConfig: DataVirtConfig = envVarNode.getProject().dvConfig;
	if (dvConfig) {
		const success: boolean = await convertEnvironmentVariableToRef(envVarNode, refName, refType, dvConfig, envVarNode.getProject().getFile());
		if (success) {
			vscode.window.showInformationMessage(`Datasource ${envVarNode.key} has been migrated to ${refType}...`);
		} else {
			vscode.window.showErrorMessage(`An error occured when trying to migrate datasource with name ${envVarNode.key} to a reference file of type ${refType}...`);
		}
	}
}

export async function convertEnvironmentVariableToRef(envVarNode: EnvironmentVariableTreeNode, refName: string, refType: string, dvConfig: DataVirtConfig, file: string): Promise<boolean> {
	if (refName && refType && dvConfig && file) {
		try {
			if (refType === constants.REFERENCE_TYPE_CONFIGMAP) {
				let configMapRef: ConfigMapConfig;
				if (!await utils.doesLocalReferenceFileExist(file, refName)) {
					configMapRef = utils.createEmptyConfigMap(refName);
				} else {
					configMapRef = await utils.loadConfigMapFromFile(utils.getFullReferenceFilePath(file, refName));
				}
				convertToConfigMap(configMapRef, envVarNode);
				await utils.saveConfigMapToFile(configMapRef, utils.getFullReferenceFilePath(file, refName));
			} else if (refType === constants.REFERENCE_TYPE_SECRET) {
				let secretRef: SecretConfig;
				if (!await utils.doesLocalReferenceFileExist(file, refName)) {
					secretRef = utils.createEmptySecret(refName);
				} else {
					secretRef = await utils.loadSecretsFromFile(utils.getFullReferenceFilePath(file, refName));
				}
				convertToSecret(secretRef, envVarNode);
				await utils.saveSecretsToFile(secretRef, utils.getFullReferenceFilePath(file, refName));
			} else {
				extension.log(`createEnvironmentVariable: Unsupported reference type ${refType}...`);
				return false;
			}
			await utils.saveModelToFile(dvConfig, file);
		} catch (error) {
			extension.log(error);
			return false;
		}
	} else {
		let missing: string = '';
		missing = utils.checkForValue(refName, 'Name', missing);
		missing = utils.checkForValue(refType, 'Type', missing);
		missing = utils.checkForValue(dvConfig, 'VDB Model',  missing);
		missing = utils.checkForValue(file, 'VDB File', missing);
		extension.log(`createEnvironmentVariable: Unable to migrate the environment variable because of missing parameter(s) ${missing}...`);
		return false;
	}
	return true;
}

function convertToConfigMap(configMap: ConfigMapConfig, envVarNode: EnvironmentVariableTreeNode) {
	const envVar: Property = getEnvironmentVariable(envVarNode);
	if (envVar) {
		envVar.valueFrom = new ConfigMapRef(new KeyRef(configMap.metadata.name, envVar.name));
		utils.setConfigMapValueForKey(configMap, envVar.name, envVar.value);
		delete envVar.value;
	}
}

function convertToSecret(secret: SecretConfig, envVarNode: EnvironmentVariableTreeNode) {
	const envVar: Property = getEnvironmentVariable(envVarNode);
	if (envVar) {
		envVar.valueFrom = new SecretRef(new KeyRef(secret.metadata.name, envVar.name));
		utils.setSecretValueForKey(secret, envVar.name, envVar.value);
		delete envVar.value;
	}
}

function getEnvironmentVariable(envVarNode: EnvironmentVariableTreeNode): Property | undefined {
	const environmentNode: EnvironmentTreeNode = envVarNode.getParent();
	const envVar: Property = environmentNode.environment.find( (element: Property) => {
		return element.name === envVarNode.key;
	});
	return envVar;
}
