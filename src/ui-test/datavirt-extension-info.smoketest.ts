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

import { expect } from 'chai';
import * as pjson from '../../package.json';
import { EditorView, ExtensionsViewItem } from 'vscode-extension-tester';
import { Marketplace } from 'vscode-uitests-tooling';

/**
 * Extension staging info verification
 *
 * @author Dominik Jelinek <djelinek@redhat.com>
 */
describe('DataVirt Tooling extension', function () {

	describe('Extensions view staging info', function () {

		let marketplace: Marketplace;
		let item: ExtensionsViewItem;

		before(async function () {
			this.timeout(10000);
			marketplace = await Marketplace.open();
		});

		after(async function () {
			await marketplace.close();
			await new EditorView().closeAllEditors();
		});

		it('Find extension', async function () {
			this.timeout(10000);
			item = await marketplace.findExtension(`@installed ${pjson.displayName}`) as ExtensionsViewItem;

			expect(item).to.be.not.undefined;
		});

		it('Extension is installed', async function () {
			this.timeout(5000);
			const installed = await item.isInstalled();

			expect(installed).to.be.true;
		});

		/**
		 * Skipped until DataVirt is published to VSCode Marketplace
		 */
		it.skip('Verify author', async function () {
			this.timeout(5000);
			const author = await item.getAuthor();

			expect(author).to.be.equal('Red Hat');
		});

		it('Verify display name', async function () {
			this.timeout(5000);
			const title = await item.getTitle();

			expect(title).to.be.equal(`${pjson.displayName}`);
		});

		it('Verify description', async function () {
			this.timeout(5000);
			const desc = await item.getDescription();

			expect(desc).to.be.equal(`${pjson.description}`);
		});

		it('Verify version', async function () {
			this.timeout(5000);
			const version = await item.getVersion();

			expect(version).to.be.equal(`${pjson.version}`);
		});
	});

});
