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

export const VDB_KIND: string = 'VirtualDatabase';
export const DDL_FILE_EXT: string = '.ddl';
export const TEMPLATE_NAME: string = '$!TEMPLATE!$';
export const DDL_NAME_PLACEHOLDER: string = '$!VDB_NAME_PLACEHOLDER!$';
export const EMPTY_VALUE: string = '';
export const RELATIONAL_DB_KEY: string = 'RelationalDB';
export const RELATIONAL_DB_TYPES: string[] = [
	'amazon-athena',
	'db2',
	'derby',
	'h2',
	'hana',
	'hive',
	'hsql',
	'impala',
	'informix',
	'ingres',
	'jtds',
	'mysql',
	'netezza',
	'oracle',
	'osisoft-pi',
	'phoenix',
	'postgresql',
	'prestodb',
	'redshift',
	'sapiq',
	'sqlserver',
	'sybase',
	'teradata',
	'teiid',
	'vertica',
];

export const REFERENCE_TYPE_SECRET: string = 'Secret';
export const REFERENCE_TYPE_CONFIGMAP: string = 'ConfigMap';
export const REFERENCE_TYPE_VALUE: string = 'Value';
export const REFERENCE_VALUE_TYPES: string[] = [
	REFERENCE_TYPE_VALUE,
	REFERENCE_TYPE_SECRET,
	REFERENCE_TYPE_CONFIGMAP
];
