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

import { DVTreeItem } from './DVTreeItem';

// simple tree node for a schema
export class SchemaTreeNode extends DVTreeItem {
	ddl: string;

	constructor(label: string, ddl: string) {
		super('dv.schema', label, vscode.TreeItemCollapsibleState.None);
		this.ddl = ddl;
	}

	getIconName(): string {
		return 'dv_schema.svg';
	}

	getToolTip(): string {
		return `Schema: ${this.label}`;
	}

	getDDL(): string {
		return this.ddl;
	}

	setDDL(ddl: string): void {
		this.ddl = ddl;
	}
}
