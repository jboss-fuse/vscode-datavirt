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
import { DataSourceConfig, Property } from '../DataVirtModel';

export class OData4BasedDataSource extends DataSourceConfig {

	constructor(name: string) {
		super(name, 'odata4');
		this.initialize();
	}

	initialize() {
		this.properties.push(new Property(`endpoint`, ''));
		this.properties.push(new Property(`securityType`, 'openid-connect'));
		this.properties.push(new Property(`userName`, ''));
		this.properties.push(new Property(`password`, ''));
		this.properties.push(new Property(`clientId`, ''));
		this.properties.push(new Property(`clientSecret`, ''));
		this.properties.push(new Property(`authorizeUrl`, ''));
		this.properties.push(new Property(`accessTokenUrl`, ''));
		this.properties.push(new Property(`scope`, ''));
	}
}
