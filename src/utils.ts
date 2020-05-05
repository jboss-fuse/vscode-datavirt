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
import * as extension from './extension';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as constants from './constants';
import { DataSourceConfig, DataVirtConfig, SecretRef, ConfigMapRef, Property } from './model/DataVirtModel';
import { log } from './extension';
import { SchemaTreeNode } from './model/tree/SchemaTreeNode';

const YAML = require('yaml');
const TMP = require('tmp');

export function loadModelFromFile(file: string): DataVirtConfig | undefined {
	try {
		const f = fs.readFileSync(file, 'utf8');
		const yamlDoc:DataVirtConfig = YAML.parse(f);
		if (yamlDoc && yamlDoc.kind && yamlDoc.kind === constants.VDB_KIND) {
			// we need to initialize datasources and env arrays if not yet present to prevent issues
			if (!yamlDoc.spec.datasources) yamlDoc.spec.datasources = new Array<DataSourceConfig>();
			if (!yamlDoc.spec.env) yamlDoc.spec.env = new Array<Property>();
			return yamlDoc;
		}
	} catch (err) {
		log(err);
	}
	return undefined;
}

export function saveModelToFile(dvConfig: DataVirtConfig, file: string): void {
	fs.writeFileSync(file, YAML.stringify(dvConfig));
}

export function replaceDDLNamePlaceholder(ddl: string, placeholder: string, replacement: string): string {
	if (ddl && placeholder && replacement) {
		return ddl.split(placeholder).join(replacement);
	}
	return undefined;
}

export function validateName(name: string): string | undefined {
	if (name && /^[a-z0-9]{4,253}$/.test(name)) {
		return undefined;
	} else {
		return 'The entered name does not comply with the naming conventions. ([a-z0-9] and length of 4-253 characters)';
	}
}

export function ensureValidEnvironmentVariableName(name: string): string | undefined {
	if (name && /^[A-Z]{1}[A-Z0-9_]{3,252}$/.test(name)) {
		return undefined;
	} else {
		return 'The entered name does not comply with the naming conventions. ([A-Z][A-Z0-9_] and length of 4-253 characters)';
	}
}

export function ensureValueIsNotEmpty(value: string): string | undefined {
	if (!value) {
		return 'Please specify a value.';
	}
	return undefined;
}

export function validateFileNotExisting(name: string): string {
	const fp: string = path.join(vscode.workspace.rootPath, `${name}.yaml`);
	if (fs.existsSync(fp)) {
		return 'There is already a file with the same name. Please choose a different name.';
	}
	return undefined;
}

export function generateReferenceValueForLabel(value: string, ref: ConfigMapRef | SecretRef): string {
	if (ref) {
		if (isSecretRef(ref)) {
			const secretRef: SecretRef = ref;
			return `${secretRef.secretKeyRef.key} @ ${secretRef.secretKeyRef.name}`;
		} else if (isConfigMapRef(ref)) {
			const configMapRef: ConfigMapRef = ref;
			return `${configMapRef.configMapKeyRef.key} @ ${configMapRef.configMapKeyRef.name}`;
		}
	}
	return value;
}

export function getDataSourceEntryByName(name: string, datasource: DataSourceConfig): Property | undefined {
	if (datasource && datasource.properties) {
		return datasource.properties.find( (value: Property) => {
			return value.name === name;
		});
	}
	return undefined;
}

export function getDataSourceByName(dvConfig: DataVirtConfig, name: string): DataSourceConfig | undefined {
	if (dvConfig && dvConfig.spec && dvConfig.spec.datasources) {
		return dvConfig.spec.datasources.find( (value: DataSourceConfig) => {
			return value.name === name;
		});
	}
	return undefined;
}

export function getEnvironmentVariableByName(name: string, enviroment: Property[]): Property | undefined {
	if (enviroment) {
		return enviroment.find( (value: Property) => {
			return value.name === name;
		});
	}
	return undefined;
}

export function isSecretRef(ref: SecretRef | ConfigMapRef): ref is SecretRef {
	return ref && (ref as SecretRef).secretKeyRef !== undefined;
}

export function isConfigMapRef(ref: SecretRef | ConfigMapRef): ref is ConfigMapRef {
	return ref && (ref as ConfigMapRef).configMapKeyRef !== undefined;
}

export function checkForValue(value: any, valueName: string, missing: string): string {
	let text: string = missing ? missing : '';
	if (!value) {
		if (text) {
			text += ', ';
		}
		text += valueName;
	}
	return text;
}

export function createTempFile(vdbName: string, sql: string): string {
	const tmpDir = TMP.dirSync();
	const tempFile: string = path.join(tmpDir.name, `${vdbName}${constants.DDL_FILE_EXT}`);
	fs.writeFileSync(tempFile, sql);
	return tempFile;
}

export function closeOpenEditorsIfRequired(filePathAndName: string): void {
	if (filePathAndName && vscode.window.visibleTextEditors) {
		vscode.window.visibleTextEditors.forEach( (editor: vscode.TextEditor) => {
			if (editor.document.fileName === filePathAndName) {
				vscode.commands.executeCommand('workbench.action.closeActiveEditor', editor);
			}
		});
	}
}

export function openDDLEditor(vdbName: string) {
	const node: SchemaTreeNode = extension.dataVirtProvider.getSchemaTreeNodeOfProject(vdbName);
	if (node) {
		vscode.commands.executeCommand('datavirt.edit.schema', node);
	}
}

export function createOrUpdateLocalReferenceFile(refName: string, refKey: string, entryValue: string, entryType: string) {
	// TODO: create or update the entry reference in a local yaml file for configMap OR secret format
	// TODO: implement me!
}
