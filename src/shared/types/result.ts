export type AppErrorCode =
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'unavailable'
  | 'unexpected';

export type AppError = Readonly<{
  code: AppErrorCode;
  message: string;
}>;

export type Result<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: AppError }>;

export const success = <T>(value: T): Result<T> => ({ ok: true, value });
export const failure = (code: AppErrorCode, message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});
