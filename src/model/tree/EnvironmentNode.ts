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
import { Property } from '../DataVirtModel';
import { DVTreeItem } from './DVTreeItem';
import { EnvironmentVariableTreeNode } from './EnvironmentVariableTreeNode';

export class EnvironmentTreeNode extends DVTreeItem {

	environment: Property[];

	constructor(label: string, environment: Property[]) {
		super('dv.environment', label, vscode.TreeItemCollapsibleState.Collapsed);
		this.environment = environment;
	}

	getIconName(): string {
		return 'dv_environment.svg';
	}

	getToolTip(): string {
		return `Environment Variables`;
	}

	initialize(): void {
		if (this.environment) {
			this.environment.forEach( (element: Property) => {
				const newItem: EnvironmentVariableTreeNode = new EnvironmentVariableTreeNode(element.name, element.value, element.valueFrom);
				newItem.setProject(this.getProject());
				newItem.parent = this;
				if (this.children.indexOf(newItem) < 0) {
					this.children.push(newItem);
				}
			});
		}
	}
}
