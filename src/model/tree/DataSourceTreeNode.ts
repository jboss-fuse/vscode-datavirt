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
import { DataSourceConfig, Property } from '../DataVirtModel';
import { DataSourceEntryTreeNode } from './DataSourceEntryTreeNode';
import { DVTreeItem } from './DVTreeItem';

export class DataSourceTreeNode extends DVTreeItem {

	dataSourceConfig: DataSourceConfig;

	constructor(parent: DVTreeItem, dataSourceConfig: DataSourceConfig) {
		super('dv.datasource', `${dataSourceConfig.name} (${dataSourceConfig.type})`, vscode.TreeItemCollapsibleState.Collapsed, parent);
		this.dataSourceConfig = dataSourceConfig;
		this.initialize();
	}

	getIconName(): string {
		return `dv_datasource.gif`;
	}

	getToolTip(): string {
		return `Data Source: ${this.label}`;
	}

	getKey(): string {
		return this.label;
	}

	setKey(key: string): void {
		this.label = key;
	}

	initialize(): void {
		if (this.dataSourceConfig && this.dataSourceConfig.properties) {
			this.dataSourceConfig.properties.forEach( (element: Property) => {
				const newItem: DataSourceEntryTreeNode = new DataSourceEntryTreeNode(this, element.name, element.value, element.valueFrom);
				if (this.children.indexOf(newItem) < 0) {
					this.children.push(newItem);
				}
			});
		}
	}

	isEmpty(): boolean {
		return !this.dataSourceConfig.properties || this.dataSourceConfig.properties.length === 0;
	}

	isValueType(): boolean {
		return true;
	}

	isSecretType(): boolean {
		return false;
	}

	isConfigMapType(): boolean {
		return false;
	}

	getReferenceName(): string {
		return undefined;
	}
}
