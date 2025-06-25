import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { schemas } from './index';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export class SchemaValidator {
  static validateOrThrow(schemaName: keyof typeof schemas, data: any): void {
    const schema = schemas[schemaName];
    if (!schema) {
      throw new Error(`Schema not found: ${schemaName}`);
    }

    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (!valid) {
      const errorMessages = validate.errors?.map(error => `${error.instancePath} ${error.message}`).join(', ');
      throw new Error(`Schema validation failed for ${schemaName}: ${errorMessages}`);
    }
  }
}