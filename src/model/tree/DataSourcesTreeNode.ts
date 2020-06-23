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
import { DataSourceConfig } from '../DataVirtModel';
import { DataSourceTreeNode } from './DataSourceTreeNode';
import { DVTreeItem } from './DVTreeItem';
import { DataSourceRefTreeNode } from './DataSourceRefTreeNode';

export class DataSourcesTreeNode extends DVTreeItem {

	datasources: DataSourceConfig[];

	constructor(parent: DVTreeItem, label: string, datasources: DataSourceConfig[]) {
		super('dv.datasources', label, vscode.TreeItemCollapsibleState.Collapsed, parent);
		this.datasources = datasources;
		this.initialize();
	}

	getIconName(): string {
		return 'dv_datasources.svg';
	}

	getToolTip(): string {
		return `Defined DataSources`;
	}

	initialize(): void {
		if (this.datasources) {
			this.datasources.forEach( (element: DataSourceConfig) => {
				const newItem: DVTreeItem = this.createDataSourceNode(element);
				if (this.children.indexOf(newItem) < 0) {
					this.children.push(newItem);
				}
			});
		}
	}

	createDataSourceNode(element: DataSourceConfig): DVTreeItem {
		if (element.properties && element.properties.length>0 && element.properties[0].valueFrom) {
			return new DataSourceRefTreeNode(this, element);
		} else {
			return new DataSourceTreeNode(this, element);
		}
	}
}
