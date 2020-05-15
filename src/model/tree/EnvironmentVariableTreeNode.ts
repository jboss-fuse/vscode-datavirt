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
import * as utils from '../../utils';
import * as vscode from 'vscode';
import { DVTreeItem } from './DVTreeItem';
import { ConfigMapRef, SecretRef } from '../DataVirtModel';
import { DVProjectTreeNode } from './DVProjectTreeNode';

export class EnvironmentVariableTreeNode extends DVTreeItem {

	key: string;
	value: string | ConfigMapRef | SecretRef;

	constructor(projectNode: DVProjectTreeNode, key: string, value: string, ref: ConfigMapRef | SecretRef) {
		super('dv.environmentvariable', `${key}: '<empty>'`, vscode.TreeItemCollapsibleState.None);
		this.setProject(projectNode);
		utils.generateReferenceValueForLabel(projectNode.file, value, ref).then( (label: string | undefined) => {
			super.label = `${key}: ${label ? label : '<empty>'}`;
			super.tooltip = super.label;
		});
		this.key = key;
		this.value = value;
	}

	getIconName(): string {
		return `dv_environment_variable.gif`;
	}

	getToolTip(): string {
		return `Environment Variable: ${this.label}`;
	}

	getKey(): string {
		return this.key;
	}

	setKey(key: string): void {
		this.key = key;
		this.label = key;
	}

	getValue(): string | ConfigMapRef | SecretRef {
		return this.value;
	}

	setValue(value: string): void {
		this.value = value;
	}
}
