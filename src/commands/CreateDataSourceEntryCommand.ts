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
import { DataVirtConfig, DataSourceConfig, ValueFrom, ConfigMapRef, SecretRef, Property, KeyRef } from '../model/DataVirtModel';

export async function createDataSourceEntryCommand(dsNode: DataSourceTreeNode) {
	if (dsNode) {
		let entryName: string = await vscode.window.showInputBox( { placeHolder: 'Enter the name of the new entry' });
		if (!entryName) {
			return;
		}

		let entryType: string = await vscode.window.showQuickPick( constants.DATASOURCE_VALUE_TYPES, { canPickMany: false, placeHolder: 'What value type do you want to create?' });
		if (!entryType) {
			return;
		}

		let refName: string;
		let refKey: string;
		if (entryType === constants.DATASOURCE_ENTRY_TYPE_CONFIGMAP || entryType === constants.DATASOURCE_ENTRY_TYPE_SECRET) {
			refName = await vscode.window.showInputBox( { placeHolder: 'Enter the name of the reference' });
			refKey = await vscode.window.showInputBox( { placeHolder: 'Enter the key for the reference' });
		} else {
			refName = '';
			refKey = '';
		}
		// explicit check for undefined because in this case the user canceled the reference name or key input box
		if (refName === undefined || refKey === undefined) {
			return;
		}

		let entryValue:string = await vscode.window.showInputBox( { placeHolder: 'Enter the value of the new entry' });
		if (!entryValue) {
			return;
		}

		const yaml: DataVirtConfig = dsNode.getProject().dvConfig;
		const file: string = dsNode.getProject().file;
		let success: boolean = await handleDataSourceEntryCreation(yaml, dsNode.dataSourceConfig, file, entryType, entryName, entryValue, refName, refKey);
		if (success) {
			vscode.window.showInformationMessage(`New datasource entry ${entryName} has been created successfully...`);
		} else {
			vscode.window.showErrorMessage(`An error occured when trying to create a new datasource entry ${entryName} in datasource ${dsNode.label}...`);
		}
	}
}

export function handleDataSourceEntryCreation(dvConfig: DataVirtConfig, dsConfig: DataSourceConfig, file: string, entryType: string, entryName: string, entryValue: string, refName?: string, refKey?: string): Promise<boolean> {
	return new Promise<boolean>( (resolve) => {
		if (dvConfig && entryType && dsConfig && file && entryName && entryValue) {
			try {
				const entry: Property = utils.getDataSourceEntryByName(entryName, dsConfig);
				if (!entry) {
					setDataSourceEntryValue(dsConfig.properties, entryType, entryName, entryValue, refName, refKey);
					createOrUpdateLocalReferenceFile(refName, refKey, entryValue, entryType);
				} else {
					resolve(false);
				}
				utils.saveModelToFile(dvConfig, file);
				resolve(true);
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log(`handleDataSourceEntryCreation: Unable to create the datasource entry ${entryName ? entryName : '<Unknown>'} in datasource ${dsConfig ? dsConfig.name : '<Unknown>'}...`);
			resolve(false);
		}
	});
}

function setDataSourceEntryValue(entries: Property[], entryType: string, entryName: string, entryValue: string, refName?: string, refKey?: string): void {
	let entry: Property;
	if (entryType === constants.DATASOURCE_ENTRY_TYPE_SECRET) {
		const secretRef = new SecretRef(new KeyRef(refName, refKey));
		const value = new ValueFrom(secretRef);
		entry = new Property(entryName, undefined, value);
	} else if (entryType === constants.DATASOURCE_ENTRY_TYPE_CONFIGMAP) {
		const configMapRef = new ConfigMapRef(new KeyRef(refName, refKey));
		const value = new ValueFrom(configMapRef);
		entry = new Property(entryName, undefined, value);
	} else {
		entry = new Property(entryName, entryValue, undefined);
	}
	entries.push(entry);
}

function createOrUpdateLocalReferenceFile(refName: string, refKey: string, entryValue: string, entryType: string) {
	// TODO: create or update the entry reference in a local yaml file for configMap OR secret format
	// TODO: implement me!
	extension.log(`call to unimplemented function createOrUpdateLocalReferenceFile(${refName}, ${refKey}, ${entryValue}, ${entryType})...`);
}
