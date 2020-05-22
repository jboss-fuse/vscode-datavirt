# Red Hat Integration - Data Virtualization Tooling

[![GitHub tag](https://img.shields.io/github/tag/jboss-fuse/vscode-datavirt.svg?style=plastic)](https://github.com/jboss-fuse/vscode-datavirt/tags)
[![Build Status](https://travis-ci.org/jboss-fuse/vscode-datavirt.svg?branch=master)](https://travis-ci.org/jboss-fuse/vscode-datavirt)
[![License](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Description

This Visual Studio Code extension provides support for Virtual Database development.

![](images/dv_extension.png)

## Features

- create and delete virtual databases
- create and delete datasources of predefined types
- create, modify and delete datasource properties
- convert datasources to a secret or configmap
- create, modify and delete environment variables
- convert environment variables to a secret or configmap
- modify the DDL part of the virtual database

## Requirements

  * Java JDK (or JRE) 8 or more recent
  * [Language Support for YAML by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)
  * [MySQL Syntax](https://marketplace.visualstudio.com/items?itemName=jakebathman.mysql-syntax)

## Contributing

This is an open source project open to anyone. Contributions are extremely welcome!

For information on getting started, refer to the [CONTRIBUTING instructions](CONTRIBUTING.md).

CI builds can be installed manually by following these instructions:

  1) Download the latest development VSIX archive [from here](https://download.jboss.org/jbosstools/vscode/snapshots/vscode-datavirt/?C=M;O=D). `(vscode-datavirt-XXX.vsix)`

  2) Click `View/Command Palette` 
  
  3) Type 'VSIX'

  4) Select 'Install from VSIX...' and choose the `.vsix` file.

## Feedback

File a bug in [Jira](https://issues.redhat.com/projects/FUSETOOLS2/).

## License

Apache License 2.0.
See [LICENSE](LICENSE) file.
