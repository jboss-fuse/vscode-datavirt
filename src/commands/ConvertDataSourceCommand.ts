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
import { DataVirtConfig, DataSourceConfig, Property, ConfigMapConfig, SecretConfig, ConfigMapRef, KeyRef, SecretRef } from '../model/DataVirtModel';
import { DataSourceTreeNode } from '../model/tree/DataSourceTreeNode';

export async function convertDataSourceToSecret(dsNode: DataSourceTreeNode) {
	await convertDataSource(dsNode, constants.REFERENCE_TYPE_SECRET);
}

export async function convertDataSourceToConfigMap(dsNode: DataSourceTreeNode) {
	await convertDataSource(dsNode, constants.REFERENCE_TYPE_CONFIGMAP);
}

async function convertDataSource(dsNode: DataSourceTreeNode, refType: string) {

	if(!dsNode.isEmpty() && !dsNode.isValueType()) {
		vscode.window.showWarningMessage(`Datasource ${dsNode.dataSourceConfig.name} cannot be migrated to ${refType} because it is already associated to a ${dsNode.isConfigMapType() ? constants.CONFIGMAP_KIND : constants.SECRET_KIND}...`);
		return;
	}

	const dvConfig: DataVirtConfig = dsNode.getProject().dvConfig;
	if (dvConfig) {
		const success: boolean = await convertDataSourceToRef(dsNode.dataSourceConfig, refType, dvConfig, dsNode.getProject().getFile());
		if (success) {
			vscode.window.showInformationMessage(`Datasource ${dsNode.dataSourceConfig.name} has been migrated to ${refType}...`);
		} else {
			vscode.window.showErrorMessage(`An error occured when trying to migrate datasource with name ${dsNode.dataSourceConfig.name} to a reference file of type ${refType}...`);
		}
	}
}

export async function convertDataSourceToRef(dsConfig: DataSourceConfig, refType: string, dvConfig: DataVirtConfig, file: string): Promise<boolean> {
	const refName: string = `datasource-${dsConfig.name}-${refType.toLowerCase()}`;
	if (refType && dvConfig && file) {
		const refFilePath: string = utils.getFullReferenceFilePath(file, refName);
		if (await utils.doesFileExist(refFilePath)) {
			extension.log(`The reference file ${refFilePath} could not be created because it already exists. Migration canceled.`);
			return false;
		}

		try {
			if (refType === constants.REFERENCE_TYPE_CONFIGMAP) {
				const configMapRef: ConfigMapConfig = utils.createEmptyConfigMap(refName);
				convertConfigMapEntries(configMapRef, dsConfig.properties);
				utils.saveConfigMapToFile(configMapRef, refFilePath);
			} else if (refType === constants.REFERENCE_TYPE_SECRET) {
				const secretRef: SecretConfig = utils.createEmptySecret(refName);
				convertSecretEntries(secretRef, dsConfig.properties);
				utils.saveSecretsToFile(secretRef, refFilePath);
			} else {
				extension.log(`createDataSource: Unsupported reference type ${refType}...`);
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
		extension.log(`createDataSource: Unable to migrate the datasource because of missing parameter(s) ${missing}...`);
		return false;
	}
	return true;
}

function convertConfigMapEntries(configMap: ConfigMapConfig, oldValues: Property[]) {
	oldValues.forEach( (property: Property) => {
		utils.setConfigMapValueForKey(configMap, property.name, property.value);
		property.valueFrom = new ConfigMapRef(new KeyRef(configMap.metadata.name, property.name));
		delete property.value;
	});
}

function convertSecretEntries(secret: SecretConfig, oldValues: Property[]) {
	oldValues.forEach( (property: Property) => {
		utils.setSecretValueForKey(secret, property.name, property.value);
		property.valueFrom = new SecretRef(new KeyRef(secret.metadata.name, property.name));
		delete property.value;
	});
}
