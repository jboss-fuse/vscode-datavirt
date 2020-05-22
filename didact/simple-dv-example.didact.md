# Welcome to the DV Tooling!

This example will walk you through creating an initial Virtual DB, configuring the DataSource, and deploying it to the running server.

Note: We are using https://github.com/teiid/teiid-openshift-examples/tree/master/tutorial/01-base-example as the basis for this example.

## Prerequisites 

You must have a few things set up prior to walking through the steps in this tutorial. 

<a href='didact://?commandId=vscode.didact.validateAllRequirements' title='Validate all requirements!'><button>Validate all Requirements at Once!</button></a>

| Requirement (Click to Verify)  | Availability | Additional Information/Solution |
| :--- | :--- | :--- |
| [Red Hat Integration - Data Virtualization Tooling extension is installed](didact://?commandId=vscode.didact.extensionRequirementCheck&text=dv-extension-requirement-status$$redhat.vscode-datavirt "Checks the VS Code workspace to make sure the DV extension is installed"){.didact} | *Status: unknown*{#dv-extension-requirement-status} 	| [Click here to install](vscode:extension/redhat.vscode-datavirt "Opens the extension page and provides an install link") |
| [Is OpenShift available?](didact://?commandId=vscode.didact.cliCommandSuccessful&text=oc-status$$oc "Tests to see if `oc` returns a result"){.didact} 	| *Status: unknown*{#oc-status} 	| See [Installing the CLI](https://docs.openshift.com/container-platform/4.2/cli_reference/openshift_cli/getting-started-cli.html#cli-installing-cli_cli-developer-commands "Documentation on how to Install the OpenShift CLI")

## Building the Virtual Database (VDB)

First, we need to create our Virtual Database (VDB). 

You can do this in a couple of ways:

* Open the `Data Virtualization` view [(Execute^)](didact://?commandId=datavirt.focus){.didact}, hover over the view title, click `...` and choose `New Virtual Database`. [(Execute^)](didact://?commandId=datavirt.create.vdb){.didact}
* Or access the same command from the Command Palette. Press `F1` or `Ctrl+Shift+P` to bring up the Command Palette, and type `New Virtual Database`. When the command is selected, click Enter. [(Execute^)](didact://?commandId=datavirt.create.vdb){.didact}

Provide the name of your new VDB - `portfolio` - and press Enter.

You should see a new file `portfolio.yaml` appear in your Explorer view and in the Data Virtualization view [(Execute^)](didact://?commandId=datavirt.focus){.didact}

## Creating the PostgreSQL Datasource

In the Data Virtualization view, drill down into `portfolio` until you find `Data Sources`. Right-click and select `New Datasource` menu.

* Name it `accountdb`
* Select `RelationalDB` as the data source type
* Choose `postgresql` as the relational database type

Expand the new `accountdb` data source in the tree and edit the default properties (mouse over the property and select the pen icon to change the value):

* For jdbc-url, type `jdbc:postgresql://accounts/accounts`
* For username, type `user`
* For password, type `changeit`
* Note, not sure what to do with the other properties? driver-class-name and importer.schemaName

## Creating the Rest Endpoint Datasource

In the Data Virtualization view, drill down into `finnhub` until you find `Data Sources`. Right-click and select `New Datasource` menu.

* Name it `quotesvc`
* Select `Rest Based` as the data source type

Expand the new `quotesvc` data source in the tree and edit the default properties (mouse over the property and select the pen icon to change the value):

* For endpoint, type `https://finnhub.io/api/v1/`

## Building the DDL for the VDB

The Virtual Database is always defined in the form of DDL. You can edit the DDL directly by mousing over the DDL node in the tree and selecting the pen icon. 

Copy and paste the following DDL into the editor:

```ddl
        CREATE DATABASE Portfolio OPTIONS (ANNOTATION 'The Portfolio VDB');
        USE DATABASE Portfolio;

        --############ translators ############
        CREATE FOREIGN DATA WRAPPER rest;
        CREATE FOREIGN DATA WRAPPER postgresql;

        --############ Servers ############
        CREATE SERVER "accountdb" FOREIGN DATA WRAPPER postgresql;
        CREATE SERVER "quotesvc" FOREIGN DATA WRAPPER rest;

        --############ Schemas ############
        CREATE SCHEMA marketdata SERVER "quotesvc";
        CREATE SCHEMA accounts SERVER "accountdb";

        CREATE VIRTUAL SCHEMA Portfolio;

        --############ Schema:marketdata ############
        SET SCHEMA marketdata;

        IMPORT FROM SERVER "quotesvc" INTO marketdata;

        --############ Schema:accounts ############
        SET SCHEMA accounts;

        IMPORT FROM SERVER "accountdb" INTO accounts OPTIONS (
                "importer.useFullSchemaName" 'false',
                "importer.tableTypes" 'TABLE,VIEW');

        --############ Schema:Portfolio ############
        SET SCHEMA Portfolio;

        CREATE VIEW StockPrice (
            symbol string,
            price double,
            CONSTRAINT ACS ACCESSPATTERN (symbol)
        ) AS
            SELECT p.symbol, y.price
            FROM accounts.PRODUCT as p, TABLE(call invokeHttp(action=>'GET', endpoint=>QUERYSTRING('quote', p.symbol as "symbol", 'bq0bisvrh5rddd65fs70' as "token"), headers=>jsonObject('application/json' as "Content-Type"))) as x,
            JSONTABLE(JSONPARSE(x.result,true), '$' COLUMNS price double path '@.c') as y

        CREATE VIEW AccountValues (
            LastName string PRIMARY KEY,
            FirstName string,
            StockValue double
        ) AS
            SELECT c.lastname as LastName, c.firstname as FirstName, sum((h.shares_count*sp.price)) as StockValue
            FROM Customer c JOIN Account a on c.SSN=a.SSN
            JOIN Holdings h on a.account_id = h.account_id
            JOIN product p on h.product_id=p.id
            JOIN StockPrice sp on sp.symbol = p.symbol
            WHERE a.type='Active'
            GROUP BY c.lastname, c.firstname;
```

## Deploying the VDB

To deploy the above Virtual Database, we will execute a command in the terminal:

```
oc create -f portfolio.yaml
```

* [Execute this](didact://?commandId=vscode.didact.sendNamedTerminalAString&text=OCTerminal$$oc%20create%20-f%20portfolio.yaml "Call `oc create -f portfolio.yaml` in the terminal window called 'OCTerminal'"){.didact}

This deployment process can take 4-5 minutes for very first time, as the Operator builds a base image to use any subsequent deployments. You can test status by issuing following command

```
oc get vdb portfolio -o yaml | grep phase
```

* [Execute this](didact://?commandId=vscode.didact.sendNamedTerminalAString&text=OCTerminal$$oc%20get%20vdb%20portfolio%20-o%20yaml%20|%20grep%20phase "Call `oc get vdb portfolio -o yaml | grep phase` in the terminal window called 'OCTerminal'"){.didact}

On a successful deployment you will see `phase: Running`, then you are ready for issuing the queries against this database.
