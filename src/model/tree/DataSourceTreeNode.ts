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
import { DataSourceConfig, Property, ConfigMapRef, SecretRef } from '../DataVirtModel';
import { DataSourceEntryTreeNode } from './DataSourceEntryTreeNode';
import { DVTreeItem } from './DVTreeItem';
import * as utils from '../../utils';

export class DataSourceTreeNode extends DVTreeItem {

	dataSourceConfig: DataSourceConfig;

	constructor(dataSourceConfig: DataSourceConfig) {
		super('dv.datasource', `${dataSourceConfig.name} (${dataSourceConfig.type})`, vscode.TreeItemCollapsibleState.Collapsed);
		this.dataSourceConfig = dataSourceConfig;
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
				const newItem: DataSourceEntryTreeNode = new DataSourceEntryTreeNode(this.getProject(), element.name, element.value, element.valueFrom);
				newItem.parent = this;
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
		return !this.isEmpty() &&
			!utils.isConfigMapRef(this.dataSourceConfig.properties[0].valueFrom) &&
			!utils.isSecretRef(this.dataSourceConfig.properties[0].valueFrom);
	}

	isSecretType(): boolean {
		return !this.isEmpty() &&
			utils.isSecretRef(this.dataSourceConfig.properties[0].valueFrom);
	}

	isConfigMapType(): boolean {
		return !this.isEmpty() &&
			utils.isConfigMapRef(this.dataSourceConfig.properties[0].valueFrom);
	}

	getReferenceName(): string {
		if (!this.isEmpty()) {
			if (utils.isConfigMapRef(this.dataSourceConfig.properties[0].valueFrom)) {
				const ref: ConfigMapRef = this.dataSourceConfig.properties[0].valueFrom;
				return ref.configMapKeyRef.name;
			} else if (utils.isSecretRef(this.dataSourceConfig.properties[0].valueFrom)) {
				const ref: SecretRef = this.dataSourceConfig.properties[0].valueFrom;
				return ref.secretKeyRef.name;
			}
		}
		return undefined;
	}
}
