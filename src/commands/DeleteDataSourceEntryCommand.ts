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
import * as vscode from 'vscode';
import * as utils from '../utils';
import * as extension from '../extension';
import { IDVConfig, IDataSourceConfig, IEnv } from '../model/DataVirtModel';
import { DataSourceConfigEntryTreeNode } from '../model/tree/DataSourceConfigEntryTreeNode';

export function deleteDataSourceEntryCommand(ctx) {
	const ds: DataSourceConfigEntryTreeNode = ctx;
	const dsConfig: IDataSourceConfig = ds.getParent().dsConfig;
	const dvConfig: IDVConfig = ds.getProject().dvConfig;
	const file: string = ds.getProject().getFile();
	const key: string = ds.getKey();

	handleDataSourceEntryDeletion(dvConfig, dsConfig, file, key)
		.then( (success: boolean) => {
			extension.dataVirtProvider.refresh();
			if (success) {
				vscode.window.showInformationMessage(`DataSource entry has been deleted...`);
			} else {
				vscode.window.showErrorMessage(`An error occured when trying to delete the datasource entry...`);
			}
		});
}

export function handleDataSourceEntryDeletion(dvConfig: IDVConfig, dsConfig: IDataSourceConfig, file: string, key: string): Promise<boolean> {
	return new Promise<boolean>( (resolve) => {
		if (dvConfig && dsConfig && file && key) {
			try {
				let deleted: boolean = false;
				const fullKey: string = utils.generateFullDataSourceConfigEntryKey(dsConfig, key).toUpperCase();
				dvConfig.spec.env.forEach( (element: IEnv) => {
					if (element.name.toUpperCase() === fullKey) {
						dvConfig.spec.env.splice(dvConfig.spec.env.indexOf(element, 0), 1);
						deleted = true;
					}
				});
				if (deleted) {
					utils.saveModelToFile(dvConfig, file);
				}
				resolve(deleted);
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log('handleDataSourceEntryEdit: Unable to delete the datasource entry...');
			resolve(false);
		}
	});
}
