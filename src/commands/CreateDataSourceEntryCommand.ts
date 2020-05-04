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
import { DataSourceTreeNode } from '../model/tree/DataSourceTreeNode';
import { DataVirtConfig, DataSourceConfig, ConfigMapRef, SecretRef, Property, KeyRef } from '../model/DataVirtModel';

export async function createDataSourceEntryCommandForValue(dsNode: DataSourceTreeNode) {
	if (dsNode) {
		let entryName: string = await queryPropertyName(dsNode);
		if (!entryName) {
			return;
		}

		let entryValue:string = await vscode.window.showInputBox( { placeHolder: 'Enter the value of the new property' });
		if (entryValue === undefined) {
			return;
		}

		const yaml: DataVirtConfig = dsNode.getProject().dvConfig;
		const file: string = dsNode.getProject().file;
		let success: boolean = await handleDataSourceEntryCreation(yaml, dsNode.dataSourceConfig, file, constants.REFERENCE_TYPE_VALUE, entryName, entryValue);
		if (success) {
			vscode.window.showInformationMessage(`New datasource property ${entryName} has been created successfully...`);
		} else {
			vscode.window.showErrorMessage(`An error occured when trying to create a new datasource property ${entryName} in datasource ${dsNode.label}...`);
		}
	}
}

export async function createDataSourceEntryCommandForSecret(dsNode: DataSourceTreeNode) {
	await createDataSourceEntryCommandForReference(dsNode, constants.REFERENCE_TYPE_SECRET);
}

export async function createDataSourceEntryCommandForConfigMap(dsNode: DataSourceTreeNode) {
	await createDataSourceEntryCommandForReference(dsNode, constants.REFERENCE_TYPE_CONFIGMAP);
}

async function createDataSourceEntryCommandForReference(dsNode: DataSourceTreeNode, type: string) {
	if (dsNode) {
		let entryName: string = await queryPropertyName(dsNode);
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

		let entryValue:string = await vscode.window.showInputBox( { placeHolder: 'Enter the value of the new property' });
		if (entryValue === undefined) {
			return;
		}

		const yaml: DataVirtConfig = dsNode.getProject().dvConfig;
		const file: string = dsNode.getProject().file;
		let success: boolean = await handleDataSourceEntryCreation(yaml, dsNode.dataSourceConfig, file, type, entryName, entryValue, refName, refKey);
		if (success) {
			vscode.window.showInformationMessage(`New datasource property ${entryName} has been created successfully...`);
		} else {
			vscode.window.showErrorMessage(`An error occured when trying to create a new datasource property ${entryName} in datasource ${dsNode.label}...`);
		}
	}
}

export function handleDataSourceEntryCreation(dvConfig: DataVirtConfig, dsConfig: DataSourceConfig, file: string, entryType: string, entryName: string, entryValue: string, refName?: string, refKey?: string): Promise<boolean> {
	return new Promise<boolean>( (resolve) => {
		if (dvConfig && entryType && dsConfig && file && entryName && entryValue !== undefined) {
			try {
				const entry: Property = utils.getDataSourceEntryByName(entryName, dsConfig);
				if (!entry) {
					setDataSourceEntryValue(dsConfig.properties, entryType, entryName, entryValue, refName, refKey);
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
			extension.log(`handleDataSourceEntryCreation: Unable to create the datasource property ${entryName ? entryName : '<Unknown>'} in datasource ${dsConfig ? dsConfig.name : '<Unknown>'}...`);
			resolve(false);
		}
	});
}

function setDataSourceEntryValue(entries: Property[], entryType: string, entryName: string, entryValue: string, refName?: string, refKey?: string): void {
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

async function queryPropertyName(dsNode: DataSourceTreeNode): Promise<string | undefined> {
	return await vscode.window.showInputBox( { validateInput: (value: string) => {
		if(utils.getDataSourceEntryByName(value, dsNode.dataSourceConfig)) {
			return `There is already a property with the name ${value}.`;
		}
		return utils.ensureValueIsNotEmpty(value);
	}, placeHolder: 'Enter the name of the new property' });
}
