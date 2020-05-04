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
import { DataSourceTreeNode } from '../model/tree/DataSourceTreeNode';
import { DataVirtConfig, DataSourceConfig } from '../model/DataVirtModel';

export function deleteDataSourceCommand(dsNode: DataSourceTreeNode): void {
	if (dsNode) {
		handleDataSourceDeletion(dsNode.dataSourceConfig.name, dsNode.getProject().dvConfig, dsNode.getProject().file)
			.then( (success: boolean) => {
				if (success) {
					vscode.window.showInformationMessage(`DataSource ${dsNode.dataSourceConfig.name} has been deleted...`);
				} else {
					vscode.window.showErrorMessage(`An error occured when trying to delete the datasource ${dsNode.dataSourceConfig.name}...`);
				}
		});
	}
}

export function handleDataSourceDeletion(dsName: string, dvConfig: DataVirtConfig, file: string): Promise<boolean> {
	return new Promise<boolean>( (resolve) => {
		if (dsName && dvConfig && file) {
			try {
				const index: number = dvConfig.spec.datasources.findIndex( (value: DataSourceConfig) => {
					return value.name === dsName;
				});
				if (index !== -1) {
					dvConfig.spec.datasources.splice(index, 1);
					utils.saveModelToFile(dvConfig, file);
					resolve(true);
				} else {
					extension.log(`Unable to delete datasource ${dsName}. Cannot find a datasource with that name.`);
					resolve(false);
				}
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log(`handleDataSourceDeletion: Unable to delete the datasource ${dsName}...`);
			resolve(false);
		}
	});
}
