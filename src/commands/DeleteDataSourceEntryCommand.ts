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
import { DataVirtConfig, DataSourceConfig, Property } from '../model/DataVirtModel';

export function deleteDataSourceEntryCommand(ds: DataSourceEntryTreeNode) {
	const dsConfig: DataSourceConfig = ds.getParent().dataSourceConfig;
	const dvConfig: DataVirtConfig = ds.getProject().dvConfig;
	const file: string = ds.getProject().getFile();
	const key: string = ds.getKey();

	handleDataSourceEntryDeletion(dvConfig, dsConfig, file, key)
		.then( (success: boolean) => {
			if (success) {
				vscode.window.showInformationMessage(`DataSource property ${key} has been deleted from ${dsConfig.name}...`);
			} else {
				vscode.window.showErrorMessage(`An error occured when trying to delete the datasource property ${key} from ${dsConfig ? dsConfig.name : '<Unknown>'}...`);
			}
		});
}

export function handleDataSourceEntryDeletion(dvConfig: DataVirtConfig, dsConfig: DataSourceConfig, file: string, key: string): Promise<boolean> {
	return new Promise<boolean>( async (resolve) => {
		if (dvConfig && dsConfig && file && key) {
			try {
				let deleted: boolean = false;
				dvConfig.spec.datasources.forEach( (element: DataSourceConfig) => {
					if (element.name === dsConfig.name) {
						const idx: number = element.properties.findIndex( (value: Property) => {
							return value.name === key;
						});
						if (idx !== -1) {
							element.properties.splice(idx, 1);
							deleted = true;
						}
					}
				});
				if (deleted) {
					await utils.saveModelToFile(dvConfig, file);
				}
				resolve(deleted);
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log(`handleDataSourceEntryDeletion: Unable to delete the datasource property ${key} from ${dsConfig ? dsConfig.name : '<Unknown>'}...`);
			resolve(false);
		}
	});
}
