'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as fs from 'fs';
import * as path from 'path';
import * as utils from '../utils';
import { IDataSourceConfig, IDVConfig, IEnv } from '../model/DataVirtModel';
import * as extension from '../extension';

const YAML = require('yaml');

const expect = chai.expect;
chai.use(sinonChai);

describe('Utils Functional Tests', function () {

	let sandbox: sinon.SinonSandbox;

	before(function () {
		sandbox = sinon.createSandbox();
	});

	after(function () {
		sandbox.restore();
	});

	afterEach(function () {
	});

	it('Test generation of datasource config prefix string', function () {
		let dsConfig: IDataSourceConfig = {
			name: 'example',
			type: 'fuse',
			entries: new Map()
		};
		expect(dsConfig).to.not.be.undefined;
		let prefix:string = utils.generateDataSourceConfigPrefix(dsConfig);
		expect(prefix).to.be.equal(`${dsConfig.type}_${dsConfig.name}`);
	});

	it('Test generation of full datasource config value key ', function () {
		let dsConfig: IDataSourceConfig = {
			name: 'example',
			type: 'fuse',
			entries: new Map()
		};
		let dsName: string = 'myKey';
		expect(dsConfig).to.not.be.undefined;
		expect(dsName).to.not.be.undefined;
		let key:string = utils.generateFullDataSourceConfigEntryKey(dsConfig, dsName);
		expect(key).to.be.equal(`${dsConfig.type}_${dsConfig.name}_${dsName}`);
	});

	it('Test name min length validation', function () {
		// min length 4
		expect(utils.validateName('xyz')).to.not.be.undefined;
		
		// positive test
		expect(utils.validateName('test')).to.be.undefined;		
	});

	it('Test name max length validation', function () {
		// max length 253
		expect(utils.validateName('1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123')).to.be.undefined;
		expect(utils.validateName('12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234')).to.not.be.undefined;
	});

	it('Test name special chars validation', function () {
		// no special chars
		expect(utils.validateName('_myTest')).to.not.be.undefined;
		expect(utils.validateName('test-1')).to.not.be.undefined;
		expect(utils.validateName('myTest$1')).to.not.be.undefined;
		expect(utils.validateName('test#1')).to.not.be.undefined;
		expect(utils.validateName('my.Test')).to.not.be.undefined;
		expect(utils.validateName('test/1')).to.not.be.undefined;

		// positive test
		expect(utils.validateName('test')).to.be.undefined;		
	});

	it('Test template name replacement', function () {
		let newName: string = 'NEWNAME';
		extension.fillDataTypes();
		let dsConfig: IDataSourceConfig = extension.DATASOURCE_TYPES.get('SpringBoot');
		expect(dsConfig).to.not.be.undefined;
		dsConfig = utils.replaceTemplateName(dsConfig, newName, extension.TEMPLATE_NAME);
		expect(dsConfig.type).to.be.equal('SPRING_DATASOURCE');
		expect(dsConfig.name).to.be.equal(newName);
	});

	it('Test I/O of vdb', function () {6
		let name: string = 'test';
		let fpOrig: string = path.resolve(__dirname, '../../testFixture', `${name}.yaml`);
		let fpTest: string = path.resolve(__dirname, '../../testFixture', `${name}2.yaml`);
		let yamlDoc:IDVConfig = utils.loadModelFromFile(fpOrig);
		expect(yamlDoc).to.not.be.undefined;
		utils.saveModelToFile(yamlDoc, fpTest);
		expect(utils.validateFileNotExisting(name)).to.not.be.undefined;
		let yamlDoc2:IDVConfig = utils.loadModelFromFile(fpTest);
		expect(yamlDoc2).to.not.be.undefined;
		expect(yamlDoc.api_version).to.be.equal(yamlDoc2.api_version);
		expect(yamlDoc.kind).to.be.equal(yamlDoc2.kind);
		expect(yamlDoc.metadata.name).to.be.equal(yamlDoc2.metadata.name);
		expect(yamlDoc.spec.env.length).to.be.equal(yamlDoc2.spec.env.length);
		expect(yamlDoc2.spec.build.source.ddl).to.not.be.undefined;
		fs.unlinkSync(fpTest);
	});
});
