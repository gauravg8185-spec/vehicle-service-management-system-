import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues[0]?.message || 'Validation error',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
    res.status(409).json({ error: 'A record with this unique identifier (VIN, license plate, or invoice number) already exists.' });
    return;
  }

  console.error('Unhandled API error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
