import { readFileSync } from 'node:fs';
import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormatsImport from 'ajv-formats';
import type { StyleAgentResponse, StyleTurnRequest } from './contracts.js';
import { requestSchemaPath, responseSchemaPath } from './paths.js';

const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
const addFormats = addFormatsImport as unknown as (instance: Ajv2020) => Ajv2020;
addFormats(ajv);

const requestValidator = ajv.compile(JSON.parse(readFileSync(requestSchemaPath, 'utf8')) as object);
const responseValidator = ajv.compile(JSON.parse(readFileSync(responseSchemaPath, 'utf8')) as object);

function formatted(errors: ErrorObject[] | null | undefined): string {
  return errors?.map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`).join('; ')
    ?? 'unknown schema validation error';
}

export class ContractValidationError extends Error {
  constructor(readonly contract: string, readonly details: string) {
    super(`${contract} validation failed: ${details}`);
    this.name = 'ContractValidationError';
  }
}

function assertWith<T>(name: string, validator: ValidateFunction, value: unknown): asserts value is T {
  if (!validator(value)) throw new ContractValidationError(name, formatted(validator.errors));
}

export function assertStyleTurnRequest(value: unknown): asserts value is StyleTurnRequest {
  assertWith<StyleTurnRequest>('StyleTurnRequest', requestValidator, value);
}

export function assertStyleAgentResponse(value: unknown): asserts value is StyleAgentResponse {
  assertWith<StyleAgentResponse>('StyleAgentResponse', responseValidator, value);
}

export function extractJsonObject(raw: string): unknown {
  const start = raw.indexOf('{');
  if (start < 0) throw new ContractValidationError('StyleAgentResponse', 'response contains no JSON object');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(raw.slice(start, index + 1)) as unknown; }
        catch (error) {
          throw new ContractValidationError('StyleAgentResponse', error instanceof Error ? error.message : String(error));
        }
      }
    }
  }
  throw new ContractValidationError('StyleAgentResponse', 'JSON object is not balanced');
}

export function parseStyleAgentResponse(raw: string): StyleAgentResponse {
  const parsed = extractJsonObject(raw);
  assertStyleAgentResponse(parsed);
  return parsed;
}
