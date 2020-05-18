'use strict';

var lsp_server_version = "0.0.3";

const download = require("mvn-artifact-download").default;
const fs = require('fs');
const path = require('path');

download('org.teiid:teiid-language-server:' + lsp_server_version, './jars/', 'https://oss.sonatype.org/content/groups/public/').then((filename)=>{
	fs.renameSync(filename, path.join('.', 'jars', 'language-server.jar'));
});
