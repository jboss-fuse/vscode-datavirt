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
import { DataVirtConfig, DataSourceConfig, Property, ValueFrom, SecretRef, ConfigMapRef, KeyRef } from '../model/DataVirtModel';

export function editDataSourceEntryCommand(dsEntryTreeNode: DataSourceEntryTreeNode) {
	const dsConfig: DataSourceConfig = dsEntryTreeNode.getParent().dataSourceConfig;
	const entry: Property = utils.getDataSourceEntryByName(dsEntryTreeNode.getKey(), dsConfig);
	if (entry.valueFrom) {
		editReferenceEntryType(dsEntryTreeNode, dsConfig, entry);
	} else {
		editValueEntryType(dsEntryTreeNode, dsConfig, entry);
	}
}

export function editValueEntryType(dsEntryTreeNode: DataSourceEntryTreeNode, dsConfig: DataSourceConfig, entry: Property) {
	vscode.window.showInputBox( { prompt: 'Enter a new value', placeHolder: `${entry.value ? entry : '<empty>'}`, value: entry.value })
		.then( ( newValue: string) => {
			if (!newValue) {
				return;
			}
			handleDataSourceEntryEdit(dsEntryTreeNode.getProject().dvConfig, dsConfig, dsEntryTreeNode.getProject().getFile(), dsEntryTreeNode.getKey(), newValue)
				.then( (success: boolean) => {
					showFeedback(success, dsEntryTreeNode.getKey(), dsConfig.name);
				});
		});
}

export function editReferenceEntryType(dsEntryTreeNode: DataSourceEntryTreeNode, dsConfig: DataSourceConfig, entry: Property) {
	const ref: ValueFrom = entry.valueFrom;
	let oldName: string;
	let oldKey: string;
	if (utils.isSecretRef(ref.valueFrom)) {
		const secRef : SecretRef = ref.valueFrom;
		oldName = secRef.secretKeyRef.name;
		oldKey = secRef.secretKeyRef.key;
	} else if (utils.isConfigMapRef(ref.valueFrom)) {
		const mapRef : ConfigMapRef = ref.valueFrom;
		oldName = mapRef.configMapKeyRef.name;
		oldKey = mapRef.configMapKeyRef.key;
	} else {
		return;
	}
	vscode.window.showInputBox( {prompt: 'Enter the new reference name', value: oldName})
		.then( (newRefName: string) => {
			if (!newRefName) {
				return;
			}
			vscode.window.showInputBox( {prompt: 'Enter the new reference key', value: oldKey})
				.then( (newRefKey: string) => {
					if (!newRefKey) {
						return;
					}
					let newRef: ValueFrom;
					let newRefValue: ConfigMapRef | SecretRef;
					if (utils.isSecretRef(ref.valueFrom)) {
						newRefValue = new SecretRef(new KeyRef(newRefName, newRefKey));
					} else if (utils.isConfigMapRef(ref.valueFrom)) {
						newRefValue = new ConfigMapRef(new KeyRef(newRefName, newRefKey));
					} else {
						extension.log(`Error modifying a datasource property ${newRefKey} @ ${newRefName} in ${dsConfig.name}. The property is neither a secret nor a config map. Please check and correct the sources in ${dsEntryTreeNode.getProject().file}.`);
						return;
					}
					newRef = new ValueFrom(newRefValue);
					handleDataSourceEntryEdit(dsEntryTreeNode.getProject().dvConfig, dsConfig, dsEntryTreeNode.getProject().getFile(), dsEntryTreeNode.getKey(), undefined, newRef)
						.then( (success: boolean) => {
							showFeedback(success, dsEntryTreeNode.getKey(), dsConfig.name);
						});
				});
		});
}

function showFeedback(success: boolean, key: string, dsName: string) {
	if (success) {
		vscode.window.showInformationMessage(`DataSource property ${key} has been modified...`);
	} else {
		vscode.window.showErrorMessage(`An error occured when trying to modify the datasource property ${key} in ${dsName}...`);
	}
}

export function handleDataSourceEntryEdit(dvConfig: DataVirtConfig, dsConfig: DataSourceConfig, file: string, key: string, newValue: string, valueFrom?: ValueFrom): Promise<boolean> {
	return new Promise<boolean>( (resolve) => {
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
						resolve(false);
						return false;
					}
					utils.saveModelToFile(dvConfig, file);
					resolve(true);
				} else {
					extension.log(`handleDataSourceEntryEdit: Unable to modify the datasource property ${key} in ${dsConfig ? dsConfig.name : '<Unknown>'} because the key does not exist...`);
					resolve(false);
				}
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log(`handleDataSourceEntryEdit: Unable to modify the datasource property ${key} in ${dsConfig ? dsConfig.name : '<Unknown>'}...`);
			resolve(false);
		}
	});
}
