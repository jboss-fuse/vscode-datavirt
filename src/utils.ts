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
import { Base64 } from 'js-base64';
import * as extension from './extension';
import * as path from 'path';
import * as vscode from 'vscode';
import * as constants from './constants';
import { DataSourceConfig, DataVirtConfig, SecretRef, ConfigMapRef, Property, SecretConfig, ConfigMapConfig, MetaData, VDBFileInfo } from './model/DataVirtModel';
import { log } from './extension';
import { SchemaTreeNode } from './model/tree/SchemaTreeNode';
import * as kubectlapi from 'vscode-kubernetes-tools-api';

const YAML = require('yaml');
const TMP = require('tmp');

export async function loadModelFromFile(file: string): Promise<DataVirtConfig | undefined> {
	try {
		const f = await vscode.workspace.fs.readFile(vscode.Uri.file(file));
		const yamlDoc:DataVirtConfig = YAML.parse(f.toString());
		if (yamlDoc && yamlDoc.kind && yamlDoc.kind === constants.VDB_KIND) {
			// we need to initialize datasources and env arrays if not yet present to prevent issues
			if (!yamlDoc.spec.datasources) yamlDoc.spec.datasources = new Array<DataSourceConfig>();
			if (!yamlDoc.spec.env) yamlDoc.spec.env = new Array<Property>();
			return yamlDoc;
		}
	} catch (err) {
		log(`loadModelFromFile(${file}) -> ${err}`);
	}
	return undefined;
}

export async function saveModelToFile(dvConfig: DataVirtConfig, file: string): Promise<void> {
	await vscode.workspace.fs.writeFile(vscode.Uri.file(file), Buffer.from(YAML.stringify(dvConfig)));
}

export function replaceDDLNamePlaceholder(ddl: string, placeholder: string, replacement: string): string {
	if (ddl && placeholder && replacement) {
		return ddl.split(placeholder).join(replacement);
	}
	return undefined;
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

export function validateDataSourcePropertyName(name: string): string | undefined {
	if (name && /^[a-zA-Z]{1}[a-zA-Z0-9-._]{3,252}$/.test(name)) {
		return undefined;
	} else {
		return 'The entered name does not comply with the naming conventions. ([a-Z][a-Z0-9-._] and length of 4-253 characters)';
	}
}

export function validateResourceName(name: string): string | undefined {
	if (name && /^[a-z]{1}[a-z0-9.\-]{3,252}$/.test(name)) {
		return undefined;
	} else {
		return 'The entered name does not comply with the naming conventions. ([a-z][a-z0-9.-] and length of 4-253 characters)';
	}
}

export function validateDataSourceName(name: string): string | undefined {
	if (name && /^[a-zA-Z]{1}[a-zA-Z0-9\-]{3,252}$/.test(name)) {
		return undefined;
	} else {
		return 'The entered name does not comply with the naming conventions. ([a-Z][a-Z0-9-] and length of 4-253 characters)';
	}
}

export function validateName(name: string): string | undefined {
	if (name && /^[a-z0-9]{4,253}$/.test(name)) {
		return undefined;
	} else {
		return 'The entered name does not comply with the naming conventions. ([a-z0-9] and length of 4-253 characters)';
	}
}

export async function validateVDBName(name: string): Promise<string | undefined>  {
	let res = validateName(name);
	if (!res) {
		res = await validateFileNotExisting(name);
	}
	return res;
}

export async function validateFileNotExisting(name: string): Promise<string | undefined> {
	const fp: string = path.join(vscode.workspace.rootPath, `${name}.yaml`);
	try {
		await vscode.workspace.fs.stat(vscode.Uri.file(fp));
	} catch (error) {
		return undefined;
	}
	return 'There is already a file with the same name. Please choose a different name.';
}

export async function generateReferenceValueForLabel(vdbFile: string, value: string, ref: ConfigMapRef | SecretRef): Promise<string> {
	if (ref) {
		if (isSecretRef(ref)) {
			const secretRef: SecretRef = ref;
			const refFile: string = getFullReferenceFilePath(vdbFile, secretRef.secretKeyRef.name);
			const secret: SecretConfig = await loadSecretsFromFile(refFile);
			const refvalue: string = getSecretValueForKey(secret, secretRef.secretKeyRef.key);
			return `${refvalue ? refvalue : '<undefined>'} (Secret: ${secretRef.secretKeyRef.name})`;
		} else if (isConfigMapRef(ref)) {
			const configMapRef: ConfigMapRef = ref;
			const refFile: string = getFullReferenceFilePath(vdbFile, configMapRef.configMapKeyRef.name);
			const configMap: ConfigMapConfig = await loadConfigMapFromFile(refFile);
			const refvalue: string = getConfigMapValueForKey(configMap, configMapRef.configMapKeyRef.key);
			return `${refvalue ? refvalue : '<undefined>'} (ConfigMap: ${configMapRef.configMapKeyRef.name})`;
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

export function isSecretRef(ref: SecretRef | ConfigMapRef | string): ref is SecretRef {
	return ref && (ref as SecretRef).secretKeyRef !== undefined;
}

export function isConfigMapRef(ref: SecretRef | ConfigMapRef | string): ref is ConfigMapRef {
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

export async function createTempFile(vdbName: string, sql: string): Promise<string> {
	const tmpDir = TMP.dirSync();
	const tempFile: string = path.join(tmpDir.name, `${vdbName}${constants.DDL_FILE_EXT}`);
	await vscode.workspace.fs.writeFile(vscode.Uri.file(tempFile), Buffer.from(sql));
	return tempFile;
}

export async function openDDLEditor(vdbName: string) {
	const node: SchemaTreeNode = await extension.dataVirtProvider.getSchemaTreeNodeOfProject(vdbName);
	if (node) {
		vscode.commands.executeCommand('datavirt.edit.schema', node);
	}
}

export async function createOrUpdateLocalReferenceFile(vdbFile: string, refName: string, variableName: string, variableValue: string, refType: string) {
	const refFile: string = getFullReferenceFilePath(vdbFile, refName);
	if (refType === constants.REFERENCE_TYPE_CONFIGMAP) {
		const configMap: ConfigMapConfig = await loadConfigMapFromFile(refFile);
		setConfigMapValueForKey(configMap, variableName, variableValue);
		await saveConfigMapToFile(configMap, refFile);
	} else if (refType === constants.REFERENCE_TYPE_SECRET) {
		const secret: SecretConfig = await loadSecretsFromFile(refFile);
		setSecretValueForKey(secret, variableName, variableValue);
		await saveSecretsToFile(secret, refFile);
	}
}

export function getFullReferenceFilePath(vdbFile: string, refName: string): string {
	return path.join(path.dirname(vdbFile), `${refName}.yaml`);
}

export async function doesLocalReferenceFileExist(vdbFile: string, refName: string): Promise<boolean> {
	const refFile: string = getFullReferenceFilePath(vdbFile, refName);
	return await doesFileExist(refFile);
}

export async function doesFileExist(file: string): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(vscode.Uri.file(file));
		return true;
	} catch (error) {
		return false;
	}
}

export async function loadPredefinedVariables(vdbFile: string, refName: string, refType: string): Promise<Array<Property>> {
	const refFile: string = getFullReferenceFilePath(vdbFile, refName);
	if (refType === constants.REFERENCE_TYPE_CONFIGMAP) {
		return await loadPredefinedVariablesFromConfigMap(refFile);
	} else if (refType === constants.REFERENCE_TYPE_SECRET) {
		return await loadPredefinedVariablesFromSecret(refFile);
	}
	return new Array<Property>();
}

export async function loadPredefinedVariablesFromConfigMap(refFile: string): Promise<Array<Property>> {
	const configMap: ConfigMapConfig = await loadConfigMapFromFile(refFile);
	const entries: Array<Property> = new Array<Property>();
	Object.entries(configMap.data).forEach( (entry: [string, any]) => {
		entries.push(new Property(entry[0], entry[1]));
	});
	return entries;
}

export async function loadPredefinedVariablesFromSecret(refFile: string): Promise<Array<Property>> {
	const secret: SecretConfig = await loadSecretsFromFile(refFile);
	const entries: Array<Property> = new Array<Property>();
	Object.entries(secret.data).forEach( (entry: [string, any]) => {
		entries.push(new Property(entry[0], Base64.decode(entry[1])));
	});
	return entries;
}

export async function loadSecretsFromFile(file: string): Promise<SecretConfig> {
	try {
		if (await doesFileExist(file)) {
			const content = await vscode.workspace.fs.readFile(vscode.Uri.file(file));
			const yamlDoc:SecretConfig = YAML.parse(content.toString());
			if (yamlDoc && yamlDoc.kind && yamlDoc.kind === constants.SECRET_KIND) {
				return yamlDoc;
			}
		} else {
			return createEmptySecret(path.parse(file).name);
		}
	} catch (err) {
		log(`loadSecretsFromFile: Loading from file ${file} failed with ${err}`);
	}
	return undefined;
}

export async function saveSecretsToFile(secretConfig: SecretConfig, file: string): Promise<boolean> {
	try {
		await vscode.workspace.fs.writeFile(vscode.Uri.file(file), Buffer.from(YAML.stringify(secretConfig)));
		return true;
	} catch (err) {
		log(`saveSecretsToFile: Saving to file ${file} failed with ${err}`);
	}
	return false;
}

export function setSecretValueForKey(secretConfig: SecretConfig, secretKey: string, secretValue: string): void {
	if (!secretConfig.data) {
		secretConfig.data = new Object();
	}
	secretConfig.data[secretKey] = Base64.encode(secretValue);
}

export function getSecretValueForKey(secretConfig: SecretConfig, secretKey: string): string | undefined {
	if (secretConfig && secretConfig.data && secretConfig.data[secretKey]) {
		return Base64.decode(secretConfig.data[secretKey]);
	}
	return undefined;
}

export async function loadConfigMapFromFile(file: string): Promise<ConfigMapConfig> {
	try {
		if (await doesFileExist(file)) {
			const content = await vscode.workspace.fs.readFile(vscode.Uri.file(file));
			const yamlDoc:ConfigMapConfig = YAML.parse(content.toString());
			if (yamlDoc && yamlDoc.kind && yamlDoc.kind === constants.CONFIGMAP_KIND) {
				return yamlDoc;
			}
		} else {
			return createEmptyConfigMap(path.parse(file).name);
		}
	} catch (err) {
		log(`loadConfigMapFromFile: Loading from file ${file} failed with ${err}`);
	}
	return undefined;
}

export async function saveConfigMapToFile(configMapConfig: ConfigMapConfig, file: string): Promise<boolean> {
	try {
		await vscode.workspace.fs.writeFile(vscode.Uri.file(file), Buffer.from(YAML.stringify(configMapConfig)));
		return true;
	} catch (err) {
		log(`saveConfigMapToFile: Saving to file ${file} failed with ${err}`);
	}
	return false;
}

export function setConfigMapValueForKey(configMapConfig: ConfigMapConfig, key: string, value: string): void {
	if (!configMapConfig.data) {
		configMapConfig.data = new Object();
	}
	configMapConfig.data[key] = value;
}

export function getConfigMapValueForKey(configMapConfig: ConfigMapConfig, key: string): string | undefined {
	if (configMapConfig && configMapConfig.data && configMapConfig.data[key]) {
		return configMapConfig.data[key];
	}
	return undefined;
}

export function createEmptySecret(name: string): SecretConfig {
	const secretRef: SecretConfig = new SecretConfig();
	secretRef.type = constants.SECRET_TYPE_OPAQUE;
	secretRef.apiVersion = 'v1';
	secretRef.kind = constants.SECRET_KIND;
	secretRef.metadata = new MetaData();
	secretRef.metadata.name = name;
	secretRef.data = new Object();
	return secretRef;
}

export function createEmptyConfigMap(name: string): ConfigMapConfig {
	const configMapRef: ConfigMapConfig = new ConfigMapConfig();
	configMapRef.apiVersion = 'v1';
	configMapRef.kind = constants.CONFIGMAP_KIND;
	configMapRef.metadata = new MetaData();
	configMapRef.metadata.name = name;
	configMapRef.data = new Object();
	return configMapRef;
}

export async function deleteVDB(vdbFile: string): Promise<void> {
	const infoObject: VDBFileInfo = extension.openedDocuments.find( (element: VDBFileInfo) => {
		return element.vdbFilePath === vdbFile;
	});
	if (infoObject) {
		if (infoObject.openEditor) {
			await vscode.workspace.fs.delete(vscode.Uri.file(infoObject.tempSQLFilePath));
		}
		extension.openedDocuments.splice(extension.openedDocuments.indexOf(infoObject), 1);
	}
	await vscode.workspace.fs.delete(vscode.Uri.file(vdbFile));
}

export function getKubectlPath(): string {
	return vscode.workspace.getConfiguration(constants.KUBERNETES_EXTENSION_CONFIG_KEY)[constants.KUBECTL_PATH_CONFIG_KEY];
}

export async function executeKubeCtlCommand(cmd: string, silent: boolean = false): Promise<boolean> {
	const k8sApi: kubectlapi.API<kubectlapi.KubectlV1> = await kubectlapi.extension.kubectl.v1;
	if (k8sApi && k8sApi.available) {
		try {
			const res: kubectlapi.KubectlV1.ShellResult = await k8sApi.api.invokeCommand(cmd);
			if (res.code !== 0 && !silent) {
				extension.log(`Operation kubectl ${cmd} returned code ${res.code}. ${res.stderr ? res.stderr.toString() : res.stdout.toString()}`);
			}
			return res.code === 0;
		} catch (error) {
			extension.log(error);
		}
	} else {
		extension.log(`Unable to acquire Kubernetes API. Make sure you have configured Kubernetes correctly and you are logged in.`);
	}
	return false;
}

export async function isVDBDeployed(name: string): Promise<boolean> {
	return isResourceDeployed(name, 'vdb');
}

export async function isResourceDeployed(name: string, type: string): Promise<boolean> {
	const cmd = `get ${type.toLowerCase()} ${name}`;
	return await executeKubeCtlCommand(cmd, true);
}

export async function deployResource(file: string, type: string) {
	const cmd = `create -f ${file}`;
	if (await executeKubeCtlCommand(cmd)) {
		vscode.window.showInformationMessage(`${type} ${file} has been deployed.`);
	}
}

export async function redeployResource(file: string, type: string) {
	const cmd = `replace ${type.toLowerCase()} -f ${file}`;
	if (await executeKubeCtlCommand(cmd)) {
		vscode.window.showInformationMessage(`${type} ${file} has been redeployed.`);
	}
}

export async function undeployResource(name: string, type: string) {
	const cmd = `delete ${type.toLowerCase()} ${name}`;
	if (await executeKubeCtlCommand(cmd)) {
		vscode.window.showInformationMessage(`${type} ${name} has been undeployed.`);
	}
}
