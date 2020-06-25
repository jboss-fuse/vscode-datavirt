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
import * as extension from '../extension';
import { DVProjectTreeNode } from '../model/tree/DVProjectTreeNode';
import * as utils from '../utils';
import { handleReferences } from './DeployVDBCommand';

export async function undeployCommand(prjNode: DVProjectTreeNode) {
	await handleReferences(prjNode, false);
	const alreadyDeployed: boolean = await utils.isVDBDeployed(prjNode.dvConfig.metadata.name);
	if (alreadyDeployed) {
		await utils.undeployResource(prjNode.dvConfig.metadata.name, 'vdb');
	} else {
		extension.log(`Cannot undeploy VDB ${prjNode.dvConfig.metadata.name} because it was not deployed.`);
	}
}
