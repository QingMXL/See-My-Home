import { readFileSync } from 'node:fs';
import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormatsImport from 'ajv-formats';
import type { HomeAgentResponse, HomeModel, HomeTurnRequest, RoomMapResponse } from './contracts.js';
import { schemaPaths } from './paths.js';

function readSchema(path: string): object {
  return JSON.parse(readFileSync(path, 'utf8')) as object;
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateFormats: true,
});
const addFormats = addFormatsImport as unknown as (instance: Ajv2020) => Ajv2020;
addFormats(ajv);

const validateHomeEvidence = ajv.compile(readSchema(schemaPaths.homeEvidence));
const validateRoomMapResponse = ajv.compile(readSchema(schemaPaths.roomMapResponse));
const validateHomeModel = ajv.compile(readSchema(schemaPaths.homeModel));
const validateAgentResponse = ajv.compile(readSchema(schemaPaths.agentResponse));

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) return 'unknown schema validation error';
  return errors
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
    .join('; ');
}

export class ContractValidationError extends Error {
  readonly contract: string;
  readonly details: string;

  constructor(contract: string, details: string) {
    super(`${contract} validation failed: ${details}`);
    this.name = 'ContractValidationError';
    this.contract = contract;
    this.details = details;
  }
}

function assertWith<T>(
  contract: string,
  validator: ValidateFunction,
  value: unknown,
): asserts value is T {
  if (!validator(value)) {
    throw new ContractValidationError(contract, formatErrors(validator.errors));
  }
}

export function assertHomeTurnRequest(value: unknown): asserts value is HomeTurnRequest {
  assertWith<HomeTurnRequest>('HomeTurnRequest', validateHomeEvidence, value);
}

export function assertHomeModel(value: unknown): asserts value is HomeModel {
  assertWith<HomeModel>('HomeModel', validateHomeModel, value);
}

export function assertAgentResponse(value: unknown): asserts value is HomeAgentResponse {
  assertWith<HomeAgentResponse>('HomeAgentResponse', validateAgentResponse, value);
}

export function assertRoomMapResponse(value: unknown): asserts value is RoomMapResponse {
  assertWith<RoomMapResponse>('RoomMapResponse', validateRoomMapResponse, value);
}

export function extractJsonObject(rawText: string): unknown {
  const start = rawText.indexOf('{');
  if (start < 0) {
    throw new ContractValidationError('HomeAgentResponse', 'response contains no JSON object');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const candidate = rawText.slice(start, index + 1);
        try {
          return JSON.parse(candidate) as unknown;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new ContractValidationError('HomeAgentResponse', `invalid JSON: ${message}`);
        }
      }
    }
  }

  throw new ContractValidationError('HomeAgentResponse', 'JSON object is not balanced');
}

export function parseAgentResponse(rawText: string): HomeAgentResponse {
  const parsed = extractJsonObject(rawText);
  assertAgentResponse(parsed);
  return parsed;
}

export function parseRoomMapResponse(rawText: string): RoomMapResponse {
  const parsed = extractJsonObject(rawText);
  assertRoomMapResponse(parsed);
  return parsed;
}
