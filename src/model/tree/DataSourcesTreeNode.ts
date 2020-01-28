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
				let parts: string[] = element.name.split("_");
				let nodeName: string;
				let key: string;
				let type: string;
				if (parts.length === 3) {
					nodeName = parts[1];
					key = parts[2];
					type = parts[0];
				} else if (parts.length === 4) {
					nodeName = parts[2];
					key = parts[3];
					type = `${parts[0]}_${parts[1]}`;
				} else {
					// error
					console.log("Invalid datasource entry name");
					return;
				}
				
				let value = element.value;
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
				node.entries.set(key, value);
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
