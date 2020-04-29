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
import { DataSourcesTreeNode } from '../model/tree/DataSourcesTreeNode';
import { DataVirtConfig, DataSourceConfig, Property } from '../model/DataVirtModel';

export async function createDataSourceCommand(dsTreeNode: DataSourcesTreeNode) {
	const dsName: string = await vscode.window.showInputBox( { validateInput: (name: string) => {
		let msg: string = utils.validateName(name);
		if (!msg) {
			if (utils.getDataSourceByName(dsTreeNode.getProject().dvConfig, name)) {
				msg = `There is already a datasource with the name ${name}.`;
			}
		}
		return msg;
	}, placeHolder: 'Enter the name of the new datasource'});
	if (!dsName) {
		return;
	}

	const dsType: string = await vscode.window.showQuickPick( Array.from(extension.DATASOURCE_TYPES.keys()), {canPickMany: false, placeHolder: 'Select the datasource type' });
	if (!dsType) {
		return;
	}

	let dsRelDBType: string;
	if (dsType === constants.RELATIONAL_DB_KEY) {
		dsRelDBType = await vscode.window.showQuickPick( Array.from(constants.RELATIONAL_DB_TYPES), {canPickMany: false, placeHolder: 'Select the relational database type' });
		if (!dsRelDBType) {
			return;
		}
	}

	const dvConfig: DataVirtConfig = dsTreeNode.getProject().dvConfig;
	if (dvConfig) {
		const success: boolean = await handleDataSourceCreation(dsName, dsType, dvConfig, dsTreeNode.getProject().getFile(), dsRelDBType);
		if (success) {
			vscode.window.showInformationMessage(`New datasource ${dsName} has been created successfully...`);
		} else {
			vscode.window.showErrorMessage(`An error occured when trying to create a new datasource...`);
		}
	}
}

export function handleDataSourceCreation(dsName: string, dsType: string, dvConfig: DataVirtConfig, file: string, dsRelDBType?: string): Promise<boolean> {
	return new Promise<boolean>( (resolve) => {
		if (dsName && dsType && dvConfig && file) {
			try {
				let dsConfig: DataSourceConfig = extension.DATASOURCE_TYPES.get(dsType);
				if (dsType === constants.RELATIONAL_DB_KEY) {
					dsConfig.type = dsRelDBType;
				}
				dsConfig.name = dsName;
				// preset empty property values
				dsConfig.properties.forEach((element: Property) => {
					if (!element.value) {
						element.value = constants.EMPTY_VALUE;
					}
				});
				if (!dvConfig.spec.datasources) {
					dvConfig.spec.datasources = new Array<DataSourceConfig>();
				}
				dvConfig.spec.datasources.push(dsConfig);
				utils.saveModelToFile(dvConfig, file);
				resolve(true);
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			let missing: string = '';
			missing = utils.checkForValue(dsName, 'Name', missing);
			missing = utils.checkForValue(dsType, 'Type', missing);
			missing = utils.checkForValue(dvConfig, 'VDB Model',  missing);
			missing = utils.checkForValue(file, 'VDB File', missing);
			extension.log(`handleDataSourceCreation: Unable to create the datasource because of missing parameter(s) ${missing}...`);
			resolve(false);
		}
	});
}
