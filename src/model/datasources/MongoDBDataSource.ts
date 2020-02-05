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
import { IDataSourceConfig } from "../DataVirtModel";

export class MongoDBDataSource implements IDataSourceConfig {

	name: string;
	type: string;
	entries: Map<string, string> = new Map();
	
	constructor(name: string) {
		this.name = name;
		this.type = 'SPRING_TEIID_DATA_MONGODB';
		this.initialize();
	}
	
	initialize() {
		this.entries.set(`${this.type}_${this.name}_REMOTE_SERVER_LIST`, '');
		this.entries.set(`${this.type}_${this.name}_USER`, '');
		this.entries.set(`${this.type}_${this.name}_PASSWORD`, '');
		this.entries.set(`${this.type}_${this.name}_DATABASE`, '');
		this.entries.set(`${this.type}_${this.name}_AUTH_DATABASE`, '');
		this.entries.set(`${this.type}_${this.name}_SSL`, '');
	}
}
