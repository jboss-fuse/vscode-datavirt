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
import * as kubectlapi from 'vscode-kubernetes-tools-api';
import * as utils from '../utils';
import * as path from 'path';
import { handleReferences } from './DeployVDBCommand';

export async function undeployCommand(prjNode: DVProjectTreeNode) {
	await handleReferences(prjNode, false);
	const alreadyDeployed: boolean = await utils.isVDBDeployed(prjNode.dvConfig.metadata.name);
	if (alreadyDeployed) {
		await handleUndeploy(prjNode.dvConfig.metadata.name, path.basename(prjNode.dvConfig.metadata.name, '.yaml'));
	}
}

async function handleUndeploy(file: string, name: string, suppressOutputs: boolean = false): Promise<void> {
	const k8sApi: kubectlapi.API<kubectlapi.KubectlV1> = await kubectlapi.extension.kubectl.v1;
	if (k8sApi && k8sApi.available) {
		try {
			extension.log(`Deleting resource ${name}...`);
			const res: kubectlapi.KubectlV1.ShellResult = await k8sApi.api.invokeCommand(`delete vdb ${name}`);
			if (res.code === 0) {
				extension.log(`${res.stdout}`);
				if (!suppressOutputs) vscode.window.showInformationMessage(`${file} has been undeployed successfully. Check the output view for more details.`);
			} else {
				extension.log(`${res.stderr}`);
				if (!suppressOutputs) vscode.window.showInformationMessage(`There was a problem undeploying ${file}. Check the output view for more details.`);
			}
		} catch (error) {
			extension.log(error);
			if (!suppressOutputs) vscode.window.showInformationMessage(`There was a problem undeploying ${file}. Check the output view for more details.`);
		}
	} else {
		extension.log(`Unable to acquire Kubernetes API. Make sure you have configured Kubernetes correctly and you are logged in.`);
		if (!suppressOutputs) vscode.window.showInformationMessage(`Unable to acquire Kubernetes API. Make sure you have configured Kubernetes correctly and you are logged in.`);
	}
}
