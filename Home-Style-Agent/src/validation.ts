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

function balancedJsonObject(raw: string, start: number): string | null {
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
      if (depth === 0) return raw.slice(start, index + 1);
    }
  }
  return null;
}

export function extractJsonObjects(raw: string): unknown[] {
  const objects: unknown[] = [];
  for (let start = raw.indexOf('{'); start >= 0; start = raw.indexOf('{', start + 1)) {
    const candidate = balancedJsonObject(raw, start);
    if (!candidate) continue;
    try { objects.push(JSON.parse(candidate) as unknown); }
    catch { /* A later balanced object may still contain the contract. */ }
  }
  return objects;
}

export function extractJsonObject(raw: string): unknown {
  const objects = extractJsonObjects(raw);
  if (objects.length > 0) return objects[0];
  if (!raw.includes('{')) throw new ContractValidationError('StyleAgentResponse', 'response contains no JSON object');
  throw new ContractValidationError('StyleAgentResponse', 'response contains no parseable JSON object');
}

export function parseStyleAgentResponse(raw: string): StyleAgentResponse {
  const objects = extractJsonObjects(raw);
  for (const parsed of [...objects].reverse()) {
    if (responseValidator(parsed)) return parsed as StyleAgentResponse;
  }
  if (objects.length === 0) {
    if (!raw.includes('{')) throw new ContractValidationError('StyleAgentResponse', 'response contains no JSON object');
    throw new ContractValidationError('StyleAgentResponse', 'response contains no parseable JSON object');
  }
  assertStyleAgentResponse(objects.at(-1));
  throw new ContractValidationError('StyleAgentResponse', 'response contains no valid contract JSON object');
}
