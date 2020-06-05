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
import { DataSourceRefTreeNode } from '../model/tree/DataSourceRefTreeNode';

const CREATE_NEW_ENTRY: string = 'New...';

export async function createDataSourceEntryCommand(dsNode: DataSourceTreeNode | DataSourceRefTreeNode) {
	let desiredType: string;
	if (dsNode.isEmpty()) {
		desiredType = await vscode.window.showQuickPick([ constants.REFERENCE_TYPE_VALUE, constants.REFERENCE_TYPE_CONFIGMAP, constants.REFERENCE_TYPE_SECRET], {canPickMany: false, placeHolder: 'Select the kind of datasource you want to create.'});
	}
	await createDataSourceEntry(dsNode, desiredType);
}

async function createDataSourceEntry(dsNode: DataSourceTreeNode | DataSourceRefTreeNode, dsPropertiesType: string) {
	if (constants.REFERENCE_TYPE_VALUE === dsPropertiesType || dsNode.isValueType()) {
		await createDataSourceEntryCommandForValue(dsNode);
	} else if (constants.REFERENCE_TYPE_CONFIGMAP === dsPropertiesType || dsNode.isConfigMapType()) {
		await createDataSourceEntryCommandForConfigMap(dsNode);
	} else if (constants.REFERENCE_TYPE_SECRET === dsPropertiesType || dsNode.isSecretType()) {
		await createDataSourceEntryCommandForSecret(dsNode);
	}
}

export async function createDataSourceEntryCommandForValue(dsNode: DataSourceTreeNode | DataSourceRefTreeNode) {
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

export async function createDataSourceEntryCommandForSecret(dsNode: DataSourceTreeNode | DataSourceRefTreeNode) {
	await createDataSourceEntryCommandForReference(dsNode, constants.REFERENCE_TYPE_SECRET);
}

export async function createDataSourceEntryCommandForConfigMap(dsNode: DataSourceTreeNode | DataSourceRefTreeNode) {
	await createDataSourceEntryCommandForReference(dsNode, constants.REFERENCE_TYPE_CONFIGMAP);
}

async function createDataSourceEntryCommandForReference(dsNode: DataSourceTreeNode | DataSourceRefTreeNode, type: string) {
	if (dsNode) {
		let refName: string = dsNode.getReferenceName();
		if(dsNode.isEmpty()) {
			refName = await vscode.window.showInputBox( { validateInput: utils.ensureValueIsNotEmpty, placeHolder: 'Enter the name of the reference' });
			if (refName === undefined) {
				return;
			}
		}

		let entryName: string;
		let entryValue: string;
		const refFileExists: boolean = await utils.doesLocalReferenceFileExist(dsNode.getProject().file, refName);
		if(refFileExists) {
			const predefinedVariables: Property[] = await utils.loadPredefinedVariables(dsNode.getProject().file, refName, type);
			const unusedVariables: Property[] = predefinedVariables.filter( (element: Property) => {
				return utils.getDataSourceEntryByName(element.name, dsNode.dataSourceConfig) === undefined;
			});
			if (unusedVariables && unusedVariables.length > 0) {
				const newProperty: Property = await queryProperty(dsNode, unusedVariables);
				if (newProperty === undefined) {
					return;
				}
				entryName = newProperty.name;
				entryValue = newProperty.value;
			} else {
				entryName = await queryPropertyName(dsNode);
				if (entryName === undefined) {
					return;
				}
			}
		} else {
			entryName = await queryPropertyName(dsNode);
			if (entryName === undefined) {
				return;
			}
		}

		entryValue = await vscode.window.showInputBox( { value: entryValue, prompt: 'Enter the value of the new property' });
		if (entryValue === undefined) {
			return;
		}

		const yaml: DataVirtConfig = dsNode.getProject().dvConfig;
		const file: string = dsNode.getProject().file;
		let success: boolean = await handleDataSourceEntryCreation(yaml, dsNode.dataSourceConfig, file, type, entryName, entryValue, refName, entryName);
		if (success) {
			vscode.window.showInformationMessage(`New datasource property ${entryName} has been created successfully...`);
		} else {
			vscode.window.showErrorMessage(`An error occured when trying to create a new datasource property ${entryName} in datasource ${dsNode.label}...`);
		}
	}
}

async function queryProperty(dsNode: DataSourceTreeNode | DataSourceRefTreeNode, predefinedVariables: Array<Property>): Promise<Property | undefined> {
	const names: string[] = new Array<string>();
	names.push(CREATE_NEW_ENTRY);

	predefinedVariables.forEach( (variable: Property) => {
		names.push(variable.name);
	});

	const selectedPropertyName: string = await vscode.window.showQuickPick(names, { canPickMany: false, placeHolder: `Select a property from the list or "New..." to create a new one` });
	if (selectedPropertyName === undefined) {
		return undefined;
	}

	if (selectedPropertyName === CREATE_NEW_ENTRY) {
		const propertyName: string = await queryPropertyName(dsNode);
		if (propertyName === undefined) {
			return;
		}
		return new Property(propertyName, '', undefined);
	} else {
		return predefinedVariables.find( (value: Property) => {
			return value.name === selectedPropertyName;
		});
	}
}

export function handleDataSourceEntryCreation(dvConfig: DataVirtConfig, dsConfig: DataSourceConfig, file: string, entryType: string, entryName: string, entryValue: string, refName?: string, refKey?: string): Promise<boolean> {
	return new Promise<boolean>( async (resolve) => {
		if (dvConfig && entryType && dsConfig && file && entryName && entryValue !== undefined) {
			try {
				const entry: Property = utils.getDataSourceEntryByName(entryName, dsConfig);
				if (!entry) {
					if (!dsConfig.properties) {
						dsConfig.properties = new Array<Property>();
					}
					setDataSourceEntryValue(dsConfig.properties, entryType, entryName, entryValue, refName, refKey);
					await utils.createOrUpdateLocalReferenceFile(file, refName, refKey, entryValue, entryType);
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

async function queryPropertyName(dsNode: DataSourceTreeNode | DataSourceRefTreeNode): Promise<string | undefined> {
	return await vscode.window.showInputBox( { validateInput: (name: string) => {
		if(utils.getDataSourceEntryByName(name, dsNode.dataSourceConfig)) {
			return `There is already a property with the name ${name}.`;
		}
		return utils.validateDataSourcePropertyName(name);
	}, placeHolder: 'Enter the name of the new property' });
}
