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
import * as fs from 'fs';
import { IDataSourceConfig, IDVConfig, IEnv } from './model/DataVirtModel';

const YAML = require('yaml');

export function mapDSConfigToEnv(dsConfig: IDataSourceConfig, yaml: IDVConfig): void {
	if (!yaml.spec.env) {
		yaml.spec.env = [];
	}
	for (let [key, value] of dsConfig.entries) {
		let envEntry: IEnv = {
			name: key.toUpperCase(),
			value: value
		};
		let found: boolean = false;
		yaml.spec.env.forEach( (element: IEnv) => {
			if (element.name === envEntry.name) {
				element.value = envEntry.value;
				found = true;
			}
		});
		if (!found) {
			yaml.spec.env.push(envEntry);
		}
	}
}

export function generateDataSourceConfigPrefix(dsConfig: IDataSourceConfig): string {
	return `${dsConfig.type}_${dsConfig.name}`;
}

export function generateFullDataSourceConfigEntryKey(dsConfig: IDataSourceConfig, key: string): string {
	return key;
	//return `${generateDataSourceConfigPrefix(dsConfig)}_${key}`;
}

export function loadModelFromFile(file: string): IDVConfig {
	const f = fs.readFileSync(file, 'utf8');
	let yamlDoc:IDVConfig = YAML.parse(f);
	return yamlDoc;
}

export function saveModelToFile(dvConfig: IDVConfig, file: string): void {
	fs.writeFileSync(file, YAML.stringify(dvConfig));
}

export function getLabelFromKey(key: string, dsName: string, dsType: string): string {
	let searchStr: string = `${dsType}_${dsName}_`;
	if (key.toUpperCase().startsWith(searchStr.toUpperCase())) {
		return key.substring(searchStr.length+1);
	}
	return key;
}

export function replaceTemplateName(dsConfig: IDataSourceConfig, dsName: string, TEMPLATE_NAME: string): IDataSourceConfig {
	let dsConfigNew : IDataSourceConfig = {
		name: dsName,
		type: dsConfig.type,
		entries: new Map<string, string>()
	};
	
	dsConfig.entries.forEach( (value: string, key: string) => {
		if (key.indexOf(TEMPLATE_NAME) != -1) {
			dsConfigNew.entries.set(key.replace(TEMPLATE_NAME, dsName.toUpperCase()), value);
		} else {
			dsConfigNew.entries.set(key, value);
		}
	});

	return dsConfigNew;
}