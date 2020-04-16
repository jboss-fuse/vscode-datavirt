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

import { workspace , ExtensionContext} from 'vscode';
import { LanguageClient, LanguageClientOptions, Executable } from 'vscode-languageclient';

const LANGUAGE_CLIENT_ID = 'LANGUAGE_ID_TEIID';

export function activate(context: ExtensionContext) {
	var path = require('path');
	var camelLanguageServerPath = context.asAbsolutePath(path.join('jars', 'language-server.jar'));
	console.log(camelLanguageServerPath);

	let serverOptions: Executable = {
		command: 'java',
		args: ['-jar', camelLanguageServerPath]
	};

	let clientOptions: LanguageClientOptions = {
		documentSelector: ['ddl'],
		synchronize: {
			configurationSection: ['ddl'],
			fileEvents: [
				workspace.createFileSystemWatcher('**/*.ddl')
			]
		}
	};

	let languageClient = new LanguageClient(LANGUAGE_CLIENT_ID, 'Language Support for Teiid', serverOptions, clientOptions);
	languageClient.onReady().then(() => {
		languageClient.outputChannel.appendLine('Teiid Language Server started');
	});
	let disposable = languageClient.start();
	context.subscriptions.push(disposable);
}
