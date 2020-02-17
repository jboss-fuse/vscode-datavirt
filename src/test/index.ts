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
import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
import { TestRunnerOptions, CoverageRunner } from './coverage';

// Linux: prevent a weird NPE when mocha on Linux requires the window size from the TTY
// Since we are not running in a tty environment, we just implement the method statically
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tty = require('tty');
if (!tty.getWindowSize) {
	tty.getWindowSize = (): number[] => {
		return [80, 75];
	};
}

function loadCoverageRunner(testsRoot: string): CoverageRunner | undefined {
	let coverageRunner: CoverageRunner;
	const coverConfigPath = path.join(testsRoot, '..', 'coverconfig.json');
	console.log('coverconfig'+coverConfigPath);
	if (!process.env.VST_DISABLE_COVERAGE && fs.existsSync(coverConfigPath)) {
		coverageRunner = new CoverageRunner(JSON.parse(fs.readFileSync(coverConfigPath, 'utf-8')) as TestRunnerOptions, testsRoot);
		coverageRunner.setupCoverage();
		return coverageRunner;
	}
}

let mocha = new Mocha({
	ui: "bdd",
	useColors: true,
	timeout: 100000,
	slow: 50000,
	reporter: 'mocha-jenkins-reporter'
});

export function run(): Promise<void> {

	const testsRoot = path.resolve(__dirname, '..');
	const coverageRunner = loadCoverageRunner(testsRoot);

	return new Promise((c, e) => {
		glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
			if (err) {
				return e(err);
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run(failures => {
					if (failures > 0) {
						e(new Error(`${failures} tests failed.`));
					} else {
						c();
					}
				}).on('end', () => coverageRunner && coverageRunner.reportCoverage());
			} catch (err) {
				e(err);
			}
		});
	});
}
