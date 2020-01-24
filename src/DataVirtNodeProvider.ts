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
import * as path from 'path';
import * as extension from './extension';
import * as fs from 'fs';
import { IDVConfig, IEnv, IDataSourceConfig } from './DataVirtModel';

const YAML = require('yaml');

export class DataVirtNodeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

	protected treeNodes: DVProjectTreeNode[] = [];
	
	static context : vscode.ExtensionContext | undefined;
	private workspace: string;

	constructor(rootpath: string, context? : vscode.ExtensionContext) {
		DataVirtNodeProvider.context = context;
		this.workspace = rootpath;
	}

	// clear the tree
	public resetList(): void {
		this.treeNodes = [];
	}

	// get the list of children for the node provider
	public getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
		if (element instanceof DVTreeItem) {
			return Promise.resolve(element.children);
		}
		return Promise.resolve(this.treeNodes);
	}

	public getParent(element?: vscode.TreeItem): Promise<vscode.TreeItem> {
		let p: vscode.TreeItem = element;
		if (element instanceof DVTreeItem) {
			p = element.getParent();
		}
		return Promise.resolve(p);
	}

	// add a child to the list of nodes
	public addChild(oldNodes: vscode.TreeItem[] = this.treeNodes, newNode: vscode.TreeItem, disableRefresh : boolean = false ): Promise<vscode.TreeItem[]> {
		return new Promise<vscode.TreeItem[]>( async (resolve, reject) => {
			if (oldNodes) {
				oldNodes.push(newNode);
				if (!disableRefresh) {
					await this.refresh().catch(err => reject(err));
				}
				resolve(oldNodes);
			}
			reject(new Error("Internal problem. TreeView is not initialized correctly."));
		});
	}

	// This method isn't used by the view currently, but is here to facilitate testing
	public removeChild(oldNodes: vscode.TreeItem[] = this.treeNodes, oldNode: vscode.TreeItem, disableRefresh : boolean = false ): Promise<vscode.TreeItem[]> {
		return new Promise<vscode.TreeItem[]>( async (resolve, reject) => {
			if (oldNodes) {
				const index = oldNodes.indexOf(oldNode);
				if (index !== -1) {
					oldNodes.splice(index, 1);
					if (!disableRefresh) {
						await this.refresh().catch(err => reject(err));
					}
				}
				resolve(oldNodes);
			}
			reject(new Error("Internal problem. TreeView is not initialized correctly."));
		});
	}

	// trigger a refresh event in VSCode
	public refresh(): Promise<void> {
		return new Promise<void>( async (resolve, reject) => {
			this.resetList();

			fs.readdirSync(this.workspace).forEach(file => {
				if (file.toLowerCase().endsWith(".yaml")) {
					this.processFile(this.workspace, file);
				}
			});

			this._onDidChangeTreeData.fire();
			if (this.treeNodes.length === 0) {
				extension.log(`Refreshing Data Virt view succeeded, no data available.`);
			}
			resolve();
		});
	}

	getTreeItem(node: vscode.TreeItem): vscode.TreeItem {
		return node;
	}

	doesNodeExist(oldNodes: vscode.TreeItem[], newNode: vscode.TreeItem): boolean {
		for (let node of oldNodes) {
			if (node.label === newNode.label) {
				return true;
			}
		}
		return false;
	}

	// process the JSON we get back from the kube rest API
	processDataVirtYAML(fullPath: string, name: string, yaml : IDVConfig): void {
		if (yaml) {
			try {
				if (yaml.kind === "VirtualDatabase") {
					// found a DV config file -> put to tree
					let title = name;
					if (yaml.metadata.name) {
						title = yaml.metadata.name;
					}
					let newItem = new DVProjectTreeNode(title, fullPath, yaml);
					if (!this.doesNodeExist(this.treeNodes, newItem)) {
						this.addChild(this.treeNodes, newItem, true);
					}
				}
			} catch( error ) {
				console.log(error);
			}
		}
	}

	processFile(folder: string, file: string) {
		let fullPath: string = path.join(folder, file);
		let yamlDoc:IDVConfig = extension.loadModelFromFile(fullPath);
		this.processDataVirtYAML(fullPath, file, yamlDoc);
	}
}

export class DVTreeItem extends vscode.TreeItem {
	type: string;
	children: DVTreeItem[];
	parent: DVTreeItem;
	label: string;
	project: DVProjectTreeNode;

	constructor(
		type: string,
		label: string,
		collapsibleState: vscode.TreeItemCollapsibleState,
		parent: DVTreeItem = undefined,
		children: DVTreeItem[] = []
	) {
		super(label, collapsibleState);
		this.contextValue = type;
		this.type = type;
		this.parent = parent;
		this.children = children;
		if (DataVirtNodeProvider.context) {
			this.iconPath = this.getIcon(DataVirtNodeProvider.context);
		}
		this.tooltip = this.getToolTip();
	}

	getToolTip(): string {
		return "";
	}

	getParent(): DVTreeItem {
		return this.parent;
	}

	getIconName(): string {
		return "undefined";
	}

	getIcon(extContext : vscode.ExtensionContext): vscode.Uri | undefined {
		let newIcon : vscode.Uri | undefined =  undefined;
		let name : string = this.getIconName();
		if (extContext) {
			const iconPath = path.join(extContext.extensionPath, `/icons/${name}`);
			newIcon = vscode.Uri.file(iconPath);
		}
		return newIcon;
	}

	setProject(prj: DVProjectTreeNode): void {
		this.project = prj;
	}

	getProject(): DVProjectTreeNode {
		return this.project;
	}
}

// simple tree node for datasources
export class DVProjectTreeNode extends DVTreeItem {
	dataSourcesNode: DataSourcesTreeNode;
	schemasNode: SchemasTreeNode;
	dvConfig: IDVConfig;
	file: string;

	constructor(
		label: string,
		file: string,
		dvConfig: IDVConfig,
	) {
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

		this.schemasNode =  new SchemasTreeNode("Schemas", this.dvConfig.spec.build.source.ddl);
		this.schemasNode.setProject(this);
		this.children.push(this.schemasNode);
	}
}

// simple tree node for datasources
export class DataSourcesTreeNode extends DVTreeItem {
	env: IEnv[];
	
	constructor(
		label: string,
		env: IEnv[],
	) {
		super("dv.datasources", label, vscode.TreeItemCollapsibleState.Collapsed);
		this.env = env;
		this.initialize();
	}

	getIconName(): string {
		return "dv_datasources.svg";
	}

	getToolTip(): string {
		return `Defined DataSources`;
	}

	initialize(): void {
		let nodes:Map<string, IDataSourceConfig> = new Map();

		if (this.env) {
			this.env.forEach(element => {
				let parts: string[] = element.name.split("_");
				let nodeName = parts[2];
				let key = parts[3];
				let value = element.value;
				let node: IDataSourceConfig = {
					name: "",
					type: "",
					entries: new Map
				};
				
				if (nodes.has(nodeName)) {
					node = nodes.get(nodeName);
				} else {
					node.name = nodeName;
					node.type = `${parts[0]}_${parts[1]}`;
					node.entries = new Map<string, string>();
				}
				node.entries.set(key, value);
				nodes.set(nodeName, node);
			});
		}		

		nodes.forEach(element => {
			let newItem = new DataSourceTreeNode(element);
			if (this.children.indexOf(newItem)<0) {
				this.children.push(newItem);
			}
		});
	}
}

// simple tree node for datasource
export class DataSourceTreeNode extends DVTreeItem {
	dsConfig: IDataSourceConfig;
	
	constructor(
		dsConfig: IDataSourceConfig,
	) {
		super("dv.datasource", `${dsConfig.name} (${dsConfig.type})`, vscode.TreeItemCollapsibleState.Collapsed);
		this.dsConfig = dsConfig;
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
		for (let [key, value] of this.dsConfig.entries) {
			let newItem: DataSourceConfigEntryTreeNode = new DataSourceConfigEntryTreeNode(key, value);
			if (this.children.indexOf(newItem)<0) {
				this.children.push(newItem);
			}
		}
	}
}

export class DataSourceConfigEntryTreeNode extends DVTreeItem {
	key: string;
	value: string;
	
	constructor(
		key: string,
		value: string
	) {
		super("dv.datasource", key, vscode.TreeItemCollapsibleState.None);
		this.key = key;
		this.value = value;
	}

	getIconName(): string {
		return `dv_datasource_entry.gif`;
	}

	getToolTip(): string {
		return `Data Source Entry: ${this.label}`;
	}

	getKey(): string {
		return this.key;
	}

	setKey(key: string): void {
		this.key = key;
		this.label = key;
	}

	getValue(): string {
		return this.value;
	}

	setValue(value: string): void {
		this.value = value;
	}
}

// simple tree node for schemas
export class SchemasTreeNode extends DVTreeItem {
	constructor(
		label: string,
		ddl: string,
	) {
		super("dv.schemas", label, vscode.TreeItemCollapsibleState.Collapsed);
		this.initialize(ddl);
	}

	getIconName(): string {
		return "dv_schemas.svg";
	}

	getToolTip(): string {
		return `Defined Schemas`;
	}

	initialize(ddl: string): void {
		let newItem = new SchemaTreeNode("ddl", ddl);
		if (this.children.indexOf(newItem)<0) {
			this.children.push(newItem);
		}
	}
}

// simple tree node for a schema
export class SchemaTreeNode extends DVTreeItem {
	ddl: string;

	constructor(
		label: string,
		ddl: string
	) {
		super("dv.schema", label, vscode.TreeItemCollapsibleState.None);
		this.ddl = ddl;
	}

	getIconName(): string {
		return "dv_schema.svg";
	}

	getToolTip(): string {
		return `Schema: ${this.label}`;
	}

	getDDL(): string {
		return this.ddl;
	}

	setDDL(ddl: string): void {
		this.ddl = ddl;
	}
}