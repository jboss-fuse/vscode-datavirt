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
import { DataSourceEntryTreeNode } from '../model/tree/DataSourceEntryTreeNode';
import { DataVirtConfig, DataSourceConfig, Property, SecretRef, ConfigMapRef, KeyRef, SecretConfig, ConfigMapConfig } from '../model/DataVirtModel';

export async function editDataSourceEntryCommand(dsEntryTreeNode: DataSourceEntryTreeNode) {
	const dsConfig: DataSourceConfig = dsEntryTreeNode.getParent().dataSourceConfig;
	const entry: Property = utils.getDataSourceEntryByName(dsEntryTreeNode.getKey(), dsConfig);
	if (entry.valueFrom) {
		await editReferenceEntryType(dsEntryTreeNode, dsConfig, entry);
	} else {
		await editValueEntryType(dsEntryTreeNode, dsConfig, entry);
	}
}

export async function editValueEntryType(dsEntryTreeNode: DataSourceEntryTreeNode, dsConfig: DataSourceConfig, entry: Property) {
	const newValue: string = await vscode.window.showInputBox( { prompt: 'Enter a new value', placeHolder: `${entry.value ? entry : '<empty>'}`, value: entry.value });
	if (newValue === undefined) {
		return;
	}
	const success: boolean = await handleDataSourceEntryEdit(dsEntryTreeNode.getProject().dvConfig, dsConfig, dsEntryTreeNode.getProject().getFile(), dsEntryTreeNode.getKey(), newValue);
	await showFeedback(success, dsEntryTreeNode.getKey(), dsConfig.name);
}

export async function editReferenceEntryType(dsEntryTreeNode: DataSourceEntryTreeNode, dsConfig: DataSourceConfig, entry: Property) {
	const ref: ConfigMapRef | SecretRef = entry.valueFrom;

	if (utils.isSecretRef(ref)) {
		const secRef : SecretRef = ref;
		const refFile: string = utils.getFullReferenceFilePath(dsEntryTreeNode.getProject().file, secRef.secretKeyRef.name);
		const secret:  SecretConfig = await utils.loadSecretsFromFile(refFile);
		const oldValue: string = utils.getSecretValueForKey(secret, secRef.secretKeyRef.key);
		const newValue: string = await queryNewValue(oldValue);
		if (newValue !== undefined && oldValue !== newValue) {
			utils.setSecretValueForKey(secret, secRef.secretKeyRef.key, newValue);
			await utils.saveSecretsToFile(secret, refFile);
			await showFeedback(true, secRef.secretKeyRef.key, dsConfig.name);
		}
	} else if (utils.isConfigMapRef(ref)) {
		const mapRef : ConfigMapRef = ref;
		const refFile: string = utils.getFullReferenceFilePath(dsEntryTreeNode.getProject().file, mapRef.configMapKeyRef.name);
		const configMap:  ConfigMapConfig = await utils.loadConfigMapFromFile(refFile);
		const oldValue: string = utils.getConfigMapValueForKey(configMap, mapRef.configMapKeyRef.key);
		const newValue: string = await queryNewValue(oldValue);
		if (newValue !== undefined && oldValue !== newValue) {
			utils.setConfigMapValueForKey(configMap, mapRef.configMapKeyRef.key, newValue);
			await utils.saveConfigMapToFile(configMap, refFile);
			await showFeedback(true, mapRef.configMapKeyRef.key, dsConfig.name);
		}
	} else {
		return;
	}
}

async function queryNewValue(oldValue: string): Promise<string | undefined> {
	return await vscode.window.showInputBox( {value: oldValue, prompt: 'Enter the new value.'} );
}

async function showFeedback(success: boolean, key: string, dsName: string) {
	if (success) {
		await vscode.window.showInformationMessage(`DataSource property ${key} has been modified...`);
	} else {
		await vscode.window.showErrorMessage(`An error occured when trying to modify the datasource property ${key} in ${dsName}...`);
	}
}

export async function handleDataSourceEntryEdit(dvConfig: DataVirtConfig, dsConfig: DataSourceConfig, file: string, key: string, newValue: string, valueFrom?: ConfigMapRef | SecretRef): Promise<boolean> {
	if (dvConfig && dsConfig && file && key) {
		try {
			const entry: Property = utils.getDataSourceEntryByName(key, dsConfig);
			if (entry) {
				if (valueFrom) {
					// its a valueFrom reference
					entry.valueFrom = valueFrom;
				} else if (newValue !== undefined) {
					// its a plain string value
					entry.value = newValue ? newValue : '';
				} else {
					extension.log(`handleDataSourceEntryEdit: Unable to modify the datasource property ${key} in ${dsConfig ? dsConfig.name : '<Unknown>'} because the key does not exist...`);
					return false;
				}
				await utils.saveModelToFile(dvConfig, file);
			} else {
				extension.log(`handleDataSourceEntryEdit: Unable to modify the datasource property ${key} in ${dsConfig ? dsConfig.name : '<Unknown>'} because the key does not exist...`);
				return false;
			}
		} catch (error) {
			extension.log(error);
			return false;
		}
	} else {
		extension.log(`handleDataSourceEntryEdit: Unable to modify the datasource property ${key} in ${dsConfig ? dsConfig.name : '<Unknown>'}...`);
		return false;
	}
	return true;
}
