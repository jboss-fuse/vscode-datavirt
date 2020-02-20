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
import { IDVConfig, IDataSourceConfig } from '../model/DataVirtModel';
import { DataSourceTreeNode } from '../model/tree/DataSourceTreeNode';
import { DataSourceConfigEntryTreeNode } from '../model/tree/DataSourceConfigEntryTreeNode';

export function editDataSourceEntryCommand(ctx) {
	let item: DataSourceConfigEntryTreeNode = ctx;
	vscode.window.showInputBox( {validateInput: utils.validateName, value: item.getValue()})
		.then( ( newValue: string) => {
			handleDataSourceEntryEdit(ctx, item, newValue)
				.then( (success: boolean) => {
					if (success) {
						vscode.window.showInformationMessage(`DataSource entry has been modified...`);
					} else {
						vscode.window.showErrorMessage(`An error occured when trying to modify the datasource entry...`);
					}
				});
		});
}

function handleDataSourceEntryEdit(ctx, item: DataSourceConfigEntryTreeNode, newValue: string): Promise<boolean> {
	return new Promise<boolean>( (resolve) => {
		if (ctx) {
			try {
				let yaml: IDVConfig = item.getProject().dvConfig;
				if (yaml) {
					let dsP: DataSourceTreeNode = item.getParent();
					let dsConfig: IDataSourceConfig = dsP.dsConfig;
					dsConfig.entries.set(item.getKey(), newValue);
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
			extension.log("handleDataSourceEntryEdit: Unable to modify the datasource entry...");
			resolve(false);
		}		
	});
}
