// ---------------------------------------------------------------------------
// API Types — mirrors the backend's request/response schemas exactly
// ---------------------------------------------------------------------------

// ---- Request Types ----

export interface GenerateRequest {
  prompt: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  system_prompt?: string;
}

export interface JobSubmission {
  prompts: string[];
  model?: string;
  max_tokens?: number;
}

// ---- Response Types ----

export interface GenerateResponse {
  text: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  created_at: string;
  completed_at?: string;
  total_prompts: number;
  completed_prompts: number;
  results: string[];
  error?: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// ---- Custom Error Classes ----

/**
 * Thrown when the API returns a non-2xx status code.
 * Carries the HTTP status, machine-readable code, and human message.
 */
export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Thrown when the fetch call fails due to a network issue
 * (DNS failure, server unreachable, CORS block, etc.).
 */
export class ConnectionError extends Error {
  constructor(message = 'Unable to connect to the server') {
    super(message);
    this.name = 'ConnectionError';
  }
}

/**
 * Thrown when the request exceeds the configured timeout.
 */
export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}
