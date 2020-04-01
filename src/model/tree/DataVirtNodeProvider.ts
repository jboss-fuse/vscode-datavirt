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
import * as extension from '../../extension';
import * as fs from 'fs';
import { IDVConfig } from '../DataVirtModel';
import { DVTreeItem } from './DVTreeItem';
import { DVProjectTreeNode } from './DVProjectTreeNode';
import * as utils from '../../utils';
import { SchemaTreeNode } from './SchemaTreeNode';

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
					await this.refresh().catch( (err) => reject(err));
				}
				resolve(oldNodes);
			}
			reject(new Error('Internal problem. TreeView is not initialized correctly.'));
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
						await this.refresh().catch( (err) => reject(err));
					}
				}
				resolve(oldNodes);
			}
			reject(new Error('Internal problem. TreeView is not initialized correctly.'));
		});
	}

	// trigger a refresh event in VSCode
	public refresh(): Promise<void> {
		return new Promise<void>( async (resolve, reject) => {
			this.resetList();

			fs.readdirSync(this.workspace).forEach( (file) => {
				if (file.toLowerCase().endsWith('.yaml')) {
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

	getSchemaTreeNodeOfProject(name: string): SchemaTreeNode {
		const projectNode:DVProjectTreeNode = this.treeNodes.find( (node) => node.label === name);
		if (projectNode && projectNode.schemasNode && projectNode.schemasNode.children && projectNode.schemasNode.children.length>0) {
			return projectNode.schemasNode.children[0] as SchemaTreeNode;
		}
		return undefined;
	}

	getTreeItem(node: vscode.TreeItem): vscode.TreeItem {
		return node;
	}

	doesNodeExist(oldNodes: vscode.TreeItem[], newNode: vscode.TreeItem): boolean {
		for (const node of oldNodes) {
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
				if (yaml.kind === 'VirtualDatabase') {
					// found a DV config file -> put to tree
					let title = name;
					if (yaml.metadata.name) {
						title = yaml.metadata.name;
					}
					const newItem = new DVProjectTreeNode(title, fullPath, yaml);
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
		const fullPath: string = path.join(folder, file);
		const yamlDoc:IDVConfig = utils.loadModelFromFile(fullPath);
		this.processDataVirtYAML(fullPath, file, yamlDoc);
	}
}

