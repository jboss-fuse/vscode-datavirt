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
'use strict';

import * as vscode from 'vscode';
import * as chai from 'chai';
import { Uri } from 'vscode';

const expect = chai.expect;
const waitUntil = require('async-wait-until');

describe('Should do completion for ddl file', () => {

	const expectedCompletion = { label: 'Create Database view' };

	it('Completes Database view for DDL', async () => {
		await testCompletion(new vscode.Position(0, 0), expectedCompletion);
	});

});

async function testCompletion(
	position: vscode.Position,
	expectedCompletion: vscode.CompletionItem
) {
	const ddlUri = Uri.parse('untitled:test.ddl');
	await vscode.workspace.openTextDocument(ddlUri);
	await checkExpectedCompletion(ddlUri, position, expectedCompletion);
}

async function checkExpectedCompletion(docUri: vscode.Uri, position: vscode.Position, expectedCompletion: vscode.CompletionItem) {
	let hasExpectedCompletion = false;
	await waitUntil(() => {
		// Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
		(vscode.commands.executeCommand('vscode.executeCompletionItemProvider', docUri, position)).then( (value) => {
			const actualCompletionList = value as vscode.CompletionList;
			const actualCompletionLabelList = actualCompletionList.items.map( (c) => { return c.label; });
			hasExpectedCompletion = actualCompletionLabelList.includes(expectedCompletion.label);
		});
		return hasExpectedCompletion;
	}, 10000, 500);
}
