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

export function deleteDataSourceCommand(ctx): void {
	if (ctx) {
		const dsNode: DataSourceTreeNode = ctx;
		const prefix: string = utils.generateDataSourceConfigPrefix(dsNode.dsConfig).toUpperCase();
		handleDataSourceDeletion(dsNode.label, prefix, dsNode.getProject().dvConfig, dsNode.getProject().file)
		.then( (success: boolean) => {
			extension.dataVirtProvider.refresh();
			if (success) {
				vscode.window.showInformationMessage(`DataSource has been deleted...`);
			} else {
				vscode.window.showErrorMessage(`An error occured when trying to delete the datasource...`);
			}
		});
	}
}

export function handleDataSourceDeletion(name: string, prefix: string, dvConfig: IDVConfig, file: string): Promise<boolean> {
	return new Promise<boolean>( (resolve) => {
		if (prefix && dvConfig && file) {
			try {
				const keys: IEnv[] = [];
				dvConfig.spec.env.forEach( (element: IEnv) => {
					if (element.name.toUpperCase().startsWith(`${prefix}_`)) {
						keys.push(element);
					}
				});
				keys.forEach( (key) => {
					dvConfig.spec.env.splice(dvConfig.spec.env.indexOf(key), 1);
				});
				utils.saveModelToFile(dvConfig, file);
				resolve(true);
			} catch (error) {
				extension.log(error);
				resolve(false);
			}
		} else {
			extension.log(`handleDataSourceDeletion: Unable to delete the datasource ${name}...`);
			resolve(false);
		}
	});
}
