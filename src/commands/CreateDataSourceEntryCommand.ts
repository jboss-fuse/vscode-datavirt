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
import { DataSourceTreeNode } from '../model/tree/DataSourceTreeNode';

export function createDataSourceEntryCommand(ctx) {
	vscode.window.showInputBox( {validateInput: utils.validateName, placeHolder: 'Enter the name of the new entry'})
		.then( (eName: string) => {
			vscode.window.showInputBox( {placeHolder: 'Enter the value of the new entry'})
				.then( (eValue: string) => {
					handleDataSourceEntryCreation(ctx, eName, eValue)
						.then( (success: boolean) => {
							if (success) {
								vscode.window.showInformationMessage(`New datasource entry ${eName} has been created successfully...`);
							} else {
								vscode.window.showErrorMessage(`An error occured when trying to create a new datasource entry...`);
							}
						});
				});
		});
}

function handleDataSourceEntryCreation(ctx, eName: string, eValue: string): Promise<boolean> {
	return new Promise<boolean>( (resolve) => {
		if (ctx) {
			try {
				const ds: DataSourceTreeNode = ctx;
				const yaml: IDVConfig = ctx.getProject().dvConfig;
				if (yaml) {
					const dsConfig: IDataSourceConfig = ds.dsConfig;
					if (!dsConfig.entries.has(eName.toUpperCase())) {
						dsConfig.entries.set(eName.toUpperCase(), eValue);
					} else {
						resolve(false);
					}
					utils.mapDSConfigToEnv(dsConfig, yaml);
					utils.saveModelToFile(yaml, ctx.getProject().getFile());
					extension.dataVirtProvider.refresh();
					resolve(true);
				} else {
					resolve(false);
				}
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log('handleDataSourceEdit: Unable to delete the datasource...');
			resolve(false);
		}
	});
}
