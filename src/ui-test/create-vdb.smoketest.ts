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
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { SideBarView, CustomTreeSection, Workbench, EditorView, DefaultTreeSection, ViewItem, TextEditor } from 'vscode-extension-tester';
import { Dialog, Input, DefaultWait } from 'vscode-uitests-tooling';

/**
 * Usecase #1 - Create the VDB
 * For more details please see https://issues.redhat.com/browse/FUSETOOLS2-252
 *
 * @author Dominik Jelinek <djelinek@redhat.com>
 */
describe('Usecase #1 - Create a new VDB', function () {

	const VDB_NAME: string = 'uitestvdb';
	const VDB_NAME_ERR: string = 'ui-test-vdb';
	const PROJECT_NAME: string = '.ui-testing';
	const VIEW_TITLE: string = 'Data Virtualization';
	const DV_COMMAND: string = 'dv: Create a Virtual Database Definition (VDB)';
	const DDL_EXT: string = '.ddl';
	const YAML_EXT: string = '.yaml';

	const TEMP_PROJECT_PATH: string = path.resolve('src', 'ui-test', PROJECT_NAME);

	/**
	 * Open temp project folder inside workspace
	 */
	before(async function () {
		this.timeout(30000);
		console.log(`Opening '${PROJECT_NAME}' project folder...`);
		await Dialog.openFolder(TEMP_PROJECT_PATH);
		console.log(`Successfully opened '${PROJECT_NAME}' project folder at path: ${TEMP_PROJECT_PATH}`);
		await DefaultWait.sleep(5000);
	});

	/**
	 * Remove all files from temp project directory
	 */
	after('Temp project cleanup', async function () {
		for (const f of fs.readdirSync(TEMP_PROJECT_PATH)) {
			if(f == 'Readme.md') {
				continue;
			}
			fsExtra.removeSync(path.join(TEMP_PROJECT_PATH, f));
		}
	});

	it('Verify Data Virtualization view expand', async function () {
		this.timeout(15000);
		const section = await new SideBarView().getContent().getSection(VIEW_TITLE) as CustomTreeSection;
		await section.expand();
		const expanded = await section.isExpanded();
		expect(expanded).to.be.true;
	});

	it('Check validation for entered name of the VDB', async function () {
		this.timeout(30000);

		/**
		 * Need to discover how to programatically execute option inside 'More Options...' dropdown menu
		 * simply workaround is to execute DV command manually trough VS Code command palette
		 */
		await new Workbench().executeCommand(DV_COMMAND);
		await DefaultWait.sleep(3000);
		///

		const input = await Input.getInstance(DefaultWait.TimePeriod.MEDIUM);
		await input.setText(VDB_NAME_ERR);
		await DefaultWait.sleep(1000);

		let errorDetected: boolean = await input.hasError();
		expect(errorDetected).to.be.true;

		await input.setText(VDB_NAME);
		await DefaultWait.sleep(1000);

		errorDetected = await input.hasError();
		expect(errorDetected).to.be.false;

		await input.cancel();
	});

	it(`Execute command - '${DV_COMMAND}'`, async function () {
		this.timeout(30000);
		await new Workbench().executeCommand(DV_COMMAND);
		await DefaultWait.sleep(3000);

		const input = await Input.getInstance(DefaultWait.TimePeriod.MEDIUM);
		await input.setText(VDB_NAME);
		await input.confirm();
	});

	it('Check that the DDL editor was automatically opened', async function () {
		this.timeout(15000);
		const titles = await new EditorView().getOpenEditorTitles();
		expect(titles).to.include(VDB_NAME + DDL_EXT);
	});

	it('Check that the newly created VDB file is existing', async function () {
		this.timeout(15000);
		const section = await new SideBarView().getContent().getSection(PROJECT_NAME) as DefaultTreeSection;

		const vdb = await section.findItem(VDB_NAME + DDL_EXT);
		expect(vdb).to.not.be.undefined;

		const yaml = await section.findItem(VDB_NAME + YAML_EXT);
		expect(yaml).to.not.be.undefined;
	});

	it('Check that the new VDB is displayed in the DataVirt view', async function () {
		this.timeout(15000);
		const section = await new SideBarView().getContent().getSection(VIEW_TITLE) as CustomTreeSection;
		await section.expand();
		const item = await section.findItem(VDB_NAME) as ViewItem;

		expect(item).to.not.be.undefined;
		expect(await item.getText()).to.be.equal(VDB_NAME);
	});

	it('Make changes inside opened DDL editor', async function () {
		this.timeout(15000);
		const editor = new TextEditor(new EditorView(), VDB_NAME + DDL_EXT);
		await editor.typeText(1, 18, 'uitest-');
		await editor.save();
		await new EditorView().closeEditor(VDB_NAME + DDL_EXT);
	});

	it('Reopen DDL editor', async function () {
		this.timeout(15000);
		const section = await new SideBarView().getContent().getSection(VIEW_TITLE);
		await section.openItem(VDB_NAME, 'Schemas', 'DDL');

		const item = await section.findItem('DDL') as ViewItem;
		const contextMenu = await item.openContextMenu();
		contextMenu.select('Modify Schema');
		await DefaultWait.sleep(1000);
	});

	it(`Check that made DDL changes are persisted inside the '${DDL_EXT}' file`, async function () {
		this.timeout(15000);
		const editor = new TextEditor(new EditorView(), VDB_NAME + DDL_EXT);
		let line1: string = await editor.getTextAtLine(1);

		expect(line1).to.include('uitest-name');
		await new EditorView().closeEditor(VDB_NAME + DDL_EXT);
	});

	it('Open YAML editor', async function () {
		this.timeout(15000);
		const section = await new SideBarView().getContent().getSection(PROJECT_NAME) as DefaultTreeSection;
		const vdb = await section.findItem(VDB_NAME + YAML_EXT);
		await vdb.select();
	});

	it(`Check that made DDL changes are persisted inside the '${YAML_EXT}' file`, async function () {
		this.timeout(15000);
		const editor = new TextEditor(new EditorView(), VDB_NAME + YAML_EXT);
		let line11: string = await editor.getTextAtLine(11);

		expect(line11).to.include('uitest-name');
		await new EditorView().closeEditor(VDB_NAME + YAML_EXT);
	});

});
