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
import { DataVirtConfig, Property, SecretRef, ConfigMapRef, KeyRef, SecretConfig, ConfigMapConfig } from '../model/DataVirtModel';
import { EnvironmentVariableTreeNode } from '../model/tree/EnvironmentVariableTreeNode';

export function editEnvironmentVariableCommand(envVarTreeNode: EnvironmentVariableTreeNode) {
	const environment: Property[] = envVarTreeNode.getParent().environment;
	const entry: Property = utils.getEnvironmentVariableByName(envVarTreeNode.getKey(), environment);
	if (entry.valueFrom) {
		editReferenceEntryType(envVarTreeNode, environment, entry);
	} else {
		editValueEntryType(envVarTreeNode, environment, entry);
	}
}

export function editValueEntryType(envVarTreeNode: EnvironmentVariableTreeNode, environment: Property[], entry: Property) {
	vscode.window.showInputBox( { prompt: 'Enter a new value', placeHolder: `${entry.value ? entry : '<empty>'}`, value: entry.value })
		.then( ( newValue: string) => {
			if (newValue === undefined) {
				return;
			}
			handleEnvironmentVariableEdit(envVarTreeNode.getProject().dvConfig, environment, envVarTreeNode.getProject().getFile(), envVarTreeNode.getKey(), newValue)
				.then( (success: boolean) => {
					showFeedback(success, envVarTreeNode.getKey());
				});
		});
}

export async function editReferenceEntryType(envVarTreeNode: EnvironmentVariableTreeNode, environment: Property[], entry: Property) {
	const ref: ConfigMapRef | SecretRef = entry.valueFrom;

	if (utils.isSecretRef(ref)) {
		const secRef : SecretRef = ref;
		const refFile: string = utils.getFullReferenceFilePath(envVarTreeNode.getProject().file, secRef.secretKeyRef.name);
		const secret:  SecretConfig = await utils.loadSecretsFromFile(refFile);
		const oldValue: string = utils.getSecretValueForKey(secret, secRef.secretKeyRef.key);
		const newValue: string = await queryNewValue(oldValue);
		if (newValue !== undefined && oldValue !== newValue) {
			utils.setSecretValueForKey(secret, secRef.secretKeyRef.key, newValue);
			await utils.saveSecretsToFile(secret, refFile);
			await showFeedback(true, secRef.secretKeyRef.key);
		}
	} else if (utils.isConfigMapRef(ref)) {
		const mapRef : ConfigMapRef = ref;
		const refFile: string = utils.getFullReferenceFilePath(envVarTreeNode.getProject().file, mapRef.configMapKeyRef.name);
		const configMap:  ConfigMapConfig = await utils.loadConfigMapFromFile(refFile);
		const oldValue: string = utils.getConfigMapValueForKey(configMap, mapRef.configMapKeyRef.key);
		const newValue: string = await queryNewValue(oldValue);
		if (newValue !== undefined && oldValue !== newValue) {
			utils.setConfigMapValueForKey(configMap, mapRef.configMapKeyRef.key, newValue);
			await utils.saveConfigMapToFile(configMap, refFile);
			await showFeedback(true, mapRef.configMapKeyRef.key);
		}
	} else {
		return;
	}
}

async function queryNewValue(oldValue: string): Promise<string | undefined> {
	return await vscode.window.showInputBox( {value: oldValue, prompt: 'Enter the new value.'} );
}

async function showFeedback(success: boolean, key: string) {
	if (success) {
		await vscode.window.showInformationMessage(`Environment variable ${key} has been modified...`);
	} else {
		await vscode.window.showErrorMessage(`An error occured when trying to modify the environment variable ${key}...`);
	}
}

export function handleEnvironmentVariableEdit(dvConfig: DataVirtConfig, environment: Property[], file: string, key: string, newValue: string, valueFrom?: ConfigMapRef | SecretRef): Promise<boolean> {
	return new Promise<boolean>( async (resolve) => {
		if (dvConfig && environment && file && key) {
			try {
				const entry: Property = utils.getEnvironmentVariableByName(key, environment);
				if (entry) {
					if (valueFrom) {
						// its a valueFrom reference
						entry.valueFrom = valueFrom;
					} else if (newValue !== undefined) {
						// its a plain string value
						entry.value = newValue ? newValue : '';
					}
					await utils.saveModelToFile(dvConfig, file);
					resolve(true);
				} else {
					extension.log(`handleEnvironmentVariableEdit: Unable to modify the environment variable ${key} because the key does not exist...`);
					resolve(false);
				}
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log(`handleEnvironmentVariableEdit: Unable to modify the environment variable ${key}...`);
			resolve(false);
		}
	});
}
