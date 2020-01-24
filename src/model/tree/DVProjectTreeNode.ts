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

import { IDVConfig } from '../DataVirtModel';
import { DVTreeItem } from './DVTreeItem';
import { SchemasTreeNode } from "./SchemasTreeNode";
import { DataSourcesTreeNode } from "./DataSourcesTreeNode";

// simple tree node for datasources
export class DVProjectTreeNode extends DVTreeItem {
	dataSourcesNode: DataSourcesTreeNode;
	schemasNode: SchemasTreeNode;
	dvConfig: IDVConfig;
	file: string;
	constructor(label: string, file: string, dvConfig: IDVConfig) {
		super("dv.project", label, vscode.TreeItemCollapsibleState.Collapsed);
		this.dvConfig = dvConfig;
		this.file = file;
		this.initialize();
	}
	getIconName(): string {
		return "dv_type.svg";
	}
	getToolTip(): string {
		return `Data Virtualization Configuration File`;
	}
	getDataSourcesNode(): DataSourcesTreeNode {
		return this.dataSourcesNode;
	}
	getSchemasNode(): SchemasTreeNode {
		return this.schemasNode;
	}
	getFile(): string {
		return this.file;
	}
	initialize(): void {
		this.dataSourcesNode = new DataSourcesTreeNode("Data Sources", this.dvConfig.spec.env);
		this.dataSourcesNode.setProject(this);
		this.children.push(this.dataSourcesNode);
		this.schemasNode = new SchemasTreeNode("Schemas", this.dvConfig.spec.build.source.ddl);
		this.schemasNode.setProject(this);
		this.children.push(this.schemasNode);
	}
}
