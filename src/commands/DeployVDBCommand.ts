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
import * as extension from '../extension';
import { DVProjectTreeNode } from '../model/tree/DVProjectTreeNode';
import * as utils from '../utils';
import * as kubectlapi from 'vscode-kubernetes-tools-api';
import { EnvironmentVariableRefTreeNode } from '../model/tree/EnvironmentVariableRefTreeNode';
import { DataSourceRefTreeNode } from '../model/tree/DataSourceRefTreeNode';

export async function deployCommand(prjNode: DVProjectTreeNode) {
	// determine configmaps / secrets to deploy first
	await handleReferences(prjNode, true);
	await handleDeploy(prjNode.dvConfig.metadata.name, prjNode.file);
}

async function handleDeploy(name: string, file: string) {
	const k8sApi: kubectlapi.API<kubectlapi.KubectlV1> = await kubectlapi.extension.kubectl.v1;
	if (k8sApi && k8sApi.available) {
		try {
			let res: kubectlapi.KubectlV1.ShellResult;
			const alreadyDeployed: boolean = await utils.isVDBDeployed(name);
			if (alreadyDeployed) {
				res = await k8sApi.api.invokeCommand(`replace -f ${file}`);
			} else {
				res = await k8sApi.api.invokeCommand(`create -f ${file}`);
			}
			if (res.code === 0) {
				extension.log(`${res.stdout}`);
				vscode.window.showInformationMessage(`Deployment of ${file} succeeded. Check the output view for more details.`);
			} else {
				extension.log(`${res.stderr}`);
				vscode.window.showErrorMessage(`Deployment of ${file} failed. Please check the output view for more details.`);
			}
		} catch (error) {
			extension.log(error);
			vscode.window.showErrorMessage(`Deployment of ${file} failed. Please check the output view for more details.`);
		}
	} else {
		extension.log(`Unable to acquire Kubernetes API. Make sure you have configured Kubernetes correctly and you are logged in.`);
		vscode.window.showErrorMessage(`Unable to acquire Kubernetes API. Make sure you have configured Kubernetes correctly and you are logged in.`);
	}
}

export async function handleReferences(prjNode: DVProjectTreeNode, deploy: boolean) {
	for (let element of prjNode.getDataSourcesNode().children) {
		if (element instanceof DataSourceRefTreeNode) {
			await handleReference(element, prjNode.getProject().file, deploy);
		}
	}
	for (let element of prjNode.getEnvironmentNode().children) {
		if (element instanceof EnvironmentVariableRefTreeNode) {
			await handleReference(element, prjNode.getProject().file, deploy);
		}
	}
}

async function handleReference(reference: DataSourceRefTreeNode | EnvironmentVariableRefTreeNode, vdbFile: string, deploy: boolean) {
	const name = reference.getReferenceName();
	const refFile = utils.getFullReferenceFilePath(vdbFile, name);
	const type = reference.getReferenceType();
	if (name && refFile && type) {
		try {
			const exists: boolean = await utils.isResourceDeployed(name, type);
			if (!exists && deploy) {
				await utils.deployResource(refFile, type);
			}
			else if (exists && deploy) {
				await utils.redeployResource(refFile, type);
			}
			else if (exists && !deploy) {
				await utils.undeployResource(name, type);
			} else {
				extension.log(`Cannot undeploy ${type} ${name} because it is not deployed.`);
			}
		}
		catch (err) {
			extension.log(err);
		}
	}
}
