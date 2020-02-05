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
import * as extension from '../../extension';
import { IEnv, IDataSourceConfig } from '../DataVirtModel';
import { DVTreeItem } from './DVTreeItem';
import { DataSourceTreeNode } from "./DataSourceTreeNode";

// simple tree node for datasources
export class DataSourcesTreeNode extends DVTreeItem {
	env: IEnv[];
	
	constructor(label: string, env: IEnv[]) {
		super("dv.datasources", label, vscode.TreeItemCollapsibleState.Collapsed);
		this.env = env;
	}

	getIconName(): string {
		return "dv_datasources.svg";
	}

	getToolTip(): string {
		return `Defined DataSources`;
	}

	initialize(): void {
		let nodes: Map<string, IDataSourceConfig> = new Map();
		if (this.env) {
			this.env.forEach(element => {
				let nodeName: string;
				let nkey: string;
				let type: string;
				let value = element.value;

				extension.DATASOURCE_TYPES.forEach( (value: IDataSourceConfig, key: string ) => {
					let prefix: string = `${value.type}_`;
					if (element.name.startsWith(prefix)) {
						type = value.type;
						nodeName = element.name.substring(prefix.length, element.name.indexOf('_', prefix.length));
						nkey = element.name.substring(element.name.indexOf(`_${nodeName}_`) + `_${nodeName}_`.length);
					}
				});
								
				let node: IDataSourceConfig = {
					name: "",
					type: "",
					entries: new Map
				};
				if (nodes.has(nodeName)) {
					node = nodes.get(nodeName);
				}
				else {
					node.name = nodeName;
					node.type = type;
					node.entries = new Map<string, string>();
				}
				node.entries.set(nkey, value);
				nodes.set(nodeName, node);
			});
		}
		nodes.forEach(element => {
			let newItem = new DataSourceTreeNode(element);
			newItem.setProject(this.getProject());
			newItem.parent = this;
			newItem.initialize();
			if (this.children.indexOf(newItem) < 0) {
				this.children.push(newItem);
			}
		});
	}
}
