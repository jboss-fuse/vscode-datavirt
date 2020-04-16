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
import { DataVirtConfig } from '../DataVirtModel';
import { DataSourcesTreeNode } from './DataSourcesTreeNode';
import { DVTreeItem } from './DVTreeItem';
import { SchemaTreeNode } from './SchemaTreeNode';

export class DVProjectTreeNode extends DVTreeItem {
	dataSourcesNode: DataSourcesTreeNode;
	schemaNode: SchemaTreeNode;
	dvConfig: DataVirtConfig;
	file: string;

	constructor(label: string, file: string, dvConfig: DataVirtConfig) {
		super('dv.project', label, vscode.TreeItemCollapsibleState.Collapsed);
		this.dvConfig = dvConfig;
		this.file = file;
		this.initialize();
	}

	getIconName(): string {
		return 'dv_type.svg';
	}

	getToolTip(): string {
		return `Data Virtualization Configuration File`;
	}

	getDataSourcesNode(): DataSourcesTreeNode {
		return this.dataSourcesNode;
	}

	getSchemaNode(): SchemaTreeNode {
		return this.schemaNode;
	}

	getFile(): string {
		return this.file;
	}

	initialize(): void {
		this.setProject(this);

		this.dataSourcesNode = new DataSourcesTreeNode('Data Sources', this.dvConfig.spec.datasources);
		this.dataSourcesNode.setProject(this.getProject());
		this.dataSourcesNode.parent = this;
		this.dataSourcesNode.initialize();
		this.children.push(this.dataSourcesNode);

		this.schemaNode = new SchemaTreeNode('Schema', this.getProject().dvConfig.spec.build.source.ddl);
		this.schemaNode.setProject(this.getProject());
		this.schemaNode.parent = this;
		this.children.push(this.schemaNode);
	}
}
