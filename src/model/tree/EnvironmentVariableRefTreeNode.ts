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
import * as extension from '../../extension';
import * as constants from '../../constants';
import * as utils from '../../utils';
import * as vscode from 'vscode';
import { DVTreeItem } from './DVTreeItem';
import { ConfigMapRef, SecretRef } from '../DataVirtModel';

export class EnvironmentVariableRefTreeNode extends DVTreeItem {

	key: string;
	ref: ConfigMapRef | SecretRef;

	constructor(parent: DVTreeItem, key: string, ref: ConfigMapRef | SecretRef) {
		super('dv.environment.variable.ref', undefined, vscode.TreeItemCollapsibleState.None, parent);
		utils.generateReferenceValueForLabel(parent.getProject().file, undefined, ref)
			.then( (label: string | undefined) => {
				this.label = `${key}: ${label ? label : '<empty>'}`;
				this.tooltip = `Environment Variable: ${this.label}`;
			})
			.finally( () => {
				extension.dataVirtProvider.refreshNode(this);
			});
		this.key = key;
		this.ref = ref;
	}

	getIconName(): string {
		return `dv_environment_variable_ref.gif`;
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

	getValue(): ConfigMapRef | SecretRef {
		return this.ref;
	}

	setValue(value: ConfigMapRef | SecretRef): void {
		this.ref = value;
	}

	isValueType(): boolean {
		return false;
	}

	isSecretType(): boolean {
		return utils.isSecretRef(this.ref);
	}

	isConfigMapType(): boolean {
		return utils.isConfigMapRef(this.ref);
	}

	getReferenceType(): string {
		if (this.isConfigMapType()) {
			return constants.REFERENCE_TYPE_CONFIGMAP;
		} else if (this.isSecretType()) {
			return constants.REFERENCE_TYPE_SECRET;
		}
		return constants.REFERENCE_TYPE_VALUE;
	}

	getReferenceName(): string {
		if (utils.isConfigMapRef(this.ref)) {
			const ref: ConfigMapRef = this.ref;
			return ref.configMapKeyRef.name;
		} else if (utils.isSecretRef(this.ref)) {
			const ref: SecretRef = this.ref;
			return ref.secretKeyRef.name;
		}
		return undefined;
	}
}
