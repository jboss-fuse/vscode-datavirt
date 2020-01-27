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
"use strict";

import * as chai from "chai";
import { log, disposeExtensionOutputChannel } from "../extension";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import * as vscode from "vscode";

const expect = chai.expect;
chai.use(sinonChai);

describe("Test Extension OutputChannel", function() {

	let sandbox: sinon.SinonSandbox;
	let createOutputChannelSpy: sinon.SinonSpy;

	before(function() {
		sandbox = sinon.createSandbox();
		createOutputChannelSpy = sinon.spy(vscode.window, "createOutputChannel");
		disposeExtensionOutputChannel();
	});

	after(function() {
		createOutputChannelSpy.restore();
		sandbox.restore();
	});

	it("Test output channel creation on new log entry", function() {
		expect(createOutputChannelSpy.called).to.be.false;
		log("This is a test!");
		expect(createOutputChannelSpy.called).to.be.true;
	});
});
