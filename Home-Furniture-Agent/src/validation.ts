import { readFileSync } from 'node:fs';
import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormatsImport from 'ajv-formats';
import type { FurnitureAgentResponse, FurnitureTurnRequest } from './contracts.js';
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

export function assertFurnitureTurnRequest(value: unknown): asserts value is FurnitureTurnRequest {
  assertWith<FurnitureTurnRequest>('FurnitureTurnRequest', requestValidator, value);
  const total = value.source_priority.sketch + value.source_priority.inspiration;
  const hasSketch = Boolean(value.sketch_asset_ref);
  const hasInspiration = Boolean(value.inspiration_asset_ref);
  if (hasSketch !== (value.source_priority.sketch > 0)) {
    throw new ContractValidationError('FurnitureTurnRequest', 'sketch priority must match sketch presence');
  }
  if (hasInspiration !== (value.source_priority.inspiration > 0)) {
    throw new ContractValidationError('FurnitureTurnRequest', 'inspiration priority must match inspiration presence');
  }
  if ((hasSketch || hasInspiration) && Math.abs(total - 1) > 0.0001) {
    throw new ContractValidationError('FurnitureTurnRequest', 'image source priorities must add up to 1');
  }
}

export function assertFurnitureAgentResponse(value: unknown): asserts value is FurnitureAgentResponse {
  assertWith<FurnitureAgentResponse>('FurnitureAgentResponse', responseValidator, value);
}

export function extractJsonObject(raw: string): unknown {
  const start = raw.indexOf('{');
  if (start < 0) throw new ContractValidationError('FurnitureAgentResponse', 'response contains no JSON object');
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
          throw new ContractValidationError('FurnitureAgentResponse', error instanceof Error ? error.message : String(error));
        }
      }
    }
  }
  throw new ContractValidationError('FurnitureAgentResponse', 'JSON object is not balanced');
}

export function parseFurnitureAgentResponse(raw: string): FurnitureAgentResponse {
  const parsed = extractJsonObject(raw);
  assertFurnitureAgentResponse(parsed);
  return parsed;
}

export function assertResponseMatchesRequest(response: FurnitureAgentResponse, request: FurnitureTurnRequest): void {
  if (response.request_id !== request.request_id) throw new Error('Furniture response request_id does not match request');
  if (response.table_type !== request.table_type) throw new Error('Furniture response table_type does not match request');
  const expected = request.design_controls.dimensions_mm;
  const actual = response.design_spec.dimensions_mm;
  if (actual.width !== expected.width || actual.depth !== expected.depth || actual.height !== expected.height) {
    throw new Error('Furniture response dimensions do not match the requested canonical dimensions');
  }
}
