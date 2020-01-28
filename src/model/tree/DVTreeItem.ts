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

import { DataVirtNodeProvider } from './DataVirtNodeProvider';
import { DVProjectTreeNode } from "./DVProjectTreeNode";

export class DVTreeItem extends vscode.TreeItem {
	type: string;
	children: DVTreeItem[];
	parent: DVTreeItem;
	label: string;
	project: DVProjectTreeNode;
	
	constructor(type: string, label: string, collapsibleState: vscode.TreeItemCollapsibleState, parent: DVTreeItem = undefined, children: DVTreeItem[] = []) {
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
	getParent(): any {
		return this.parent;
	}
	getIconName(): string {
		return "undefined";
	}
	getIcon(extContext: vscode.ExtensionContext): vscode.Uri | undefined {
		let newIcon: vscode.Uri | undefined = undefined;
		let name: string = this.getIconName();
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
