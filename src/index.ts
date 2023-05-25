#! /usr/bin/env node
import fs from 'fs';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import postgres from 'postgres';

const argv = yargs(hideBin(process.argv)).argv;

const args = (argv as any)._;

const configPath = args[0];

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const {
  dbTypesDir,
  dbUrl,
  options,
} = config;

if (!dbTypesDir) {
  throw new Error('No dbTypesDir specified');
}

if (!dbUrl) {
  throw new Error('No dbUrl specified');
}

// go through each directory and make sure it exists
const dirs = dbTypesDir.split('/');
let dir = '';
for (let i = 0; i < dirs.length; i++) {
  dir += dirs[i] + '/';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

const sql = postgres(dbUrl);

// convert to camel case. If underscore is found, convert the next letter or number to uppercase and remove the underscore
const convertToCamelCase = (str: string) =>
  str.replace(/_([a-z0-9])/g, function (g) { return g[1].toUpperCase(); });

const convertToPascalCase = (str: string) =>
  str.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); }).replace(/^[a-z]/g, function (g) { return g[0].toUpperCase(); });

const getDataType = (dataType: string) => {
  if (dataType.includes('int')) {
    return 'number';
  }

  if (dataType.includes('text') || dataType.includes('char') || dataType.includes('uuid')) {
    return 'string';
  }

  if (dataType.includes('date') || dataType.includes('time')) {
    return 'Date';
  }

  if (dataType.includes('bool')) {
    return 'boolean';
  }

  return 'string';
}

const generateDatabaseTypes = async () => {
  // Select all columns
  const data = await sql`SELECT
      table_name,
      column_name,
      is_nullable,
      data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, column_name
      `;

  const dataGroupedByTableName = data.reduce((acc: any, curr: any) => {
    const { table_name, column_name, is_nullable, data_type } = curr;
    if (!acc[table_name]) {
      acc[table_name] = [];
    }

    acc[table_name].push({ column_name, is_nullable, data_type });
    return acc;
  }, {});

  let content = '';

  if (options.namespace) {
    content += `export namespace ${options.namespace} {\n`;
  }

  for (const tableName in dataGroupedByTableName) {
    const columns = dataGroupedByTableName[tableName];

    const shouldExportTables = !options.namespace;

    content += `${shouldExportTables ? 'export ' : '  '}interface ${convertToPascalCase(tableName)} {\n`;
    for (const column of columns) {
      const { column_name, data_type } = column;
      const dataType = getDataType(data_type);
      const isNullable = column.is_nullable === 'YES';

      const columnName = options.columnCase === 'camel' ? convertToCamelCase(column_name) : column_name;

      content += `  ${!!options.namespace ? '  ' : ''}${columnName}: ${dataType}${isNullable ? ' | null' : ''};\n`;
    }
    content += `${!!options.namespace ? '  ' : ''}}\n\n`;
  }

  if (options.namespace) {
    content += '}\n';
  }

  // Write to file
  fs.writeFileSync(`${dbTypesDir}/dbTypes.d.ts`, content);

  process.exit(0);
}

generateDatabaseTypes();
