## Overview

This is a simple example of how to use the [DB Schema Gen](https://github.com/austinChappell/db-schema-gen) to generate types from a database schema.

## Usage

1. Run `npm install db-schema-gen` or `yarn add db-schema-gen`
2. Create a `.json` config file with the following contents:
```json
{
  "language": "postgresql",
  "outputDir": "types",
  "url": "YOUR_CONNECTION_STRING",
  "options": {
    "namespace": "DB",
    "columnCase": "camel"
  }
}
```
3. Run `db-schema-gen --config YOUR_CONFIG_FILE.json`
4. Enjoy your generated types!
