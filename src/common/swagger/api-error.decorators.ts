import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from './error-response.dto';

export function ApiValidationErrorResponse() {
  return ApiBadRequestResponse({
    description: 'Validation error',
    type: ErrorResponseDto,
    content: {
      'application/json': {
        example: {
          statusCode: 400,
          message: [
            'email must be an email',
            'password must be at least 8 characters',
          ],
          error: 'Bad Request',
        },
      },
    },
  });
}

export function ApiUnauthorizedErrorResponse() {
  return ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT',
    type: ErrorResponseDto,
    content: {
      'application/json': {
        example: {
          statusCode: 401,
          message: 'Unauthorized',
          error: 'Unauthorized',
        },
      },
    },
  });
}

export function ApiForbiddenErrorResponse(description = 'Forbidden') {
  return ApiForbiddenResponse({
    description,
    type: ErrorResponseDto,
    content: {
      'application/json': {
        example: {
          statusCode: 403,
          message: 'Cannot update archived task',
          error: 'Forbidden',
        },
      },
    },
  });
}

export function ApiNotFoundErrorResponse(description = 'Resource not found') {
  return ApiNotFoundResponse({
    description,
    type: ErrorResponseDto,
    content: {
      'application/json': {
        example: {
          statusCode: 404,
          message: 'Task not found',
          error: 'Not Found',
        },
      },
    },
  });
}

export function ApiConflictErrorResponse() {
  return ApiConflictResponse({
    description: 'Resource conflict',
    type: ErrorResponseDto,
    content: {
      'application/json': {
        example: {
          statusCode: 409,
          message: 'Email already registered',
          error: 'Conflict',
        },
      },
    },
  });
}

export function ApiThrottledErrorResponse() {
  return ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded',
    type: ErrorResponseDto,
    content: {
      'application/json': {
        example: {
          statusCode: 429,
          message: 'ThrottlerException: Too Many Requests',
          error: 'Too Many Requests',
        },
      },
    },
  });
}

export function ApiAuthErrorResponses() {
  return applyDecorators(
    ApiValidationErrorResponse(),
    ApiUnauthorizedErrorResponse(),
    ApiThrottledErrorResponse(),
  );
}

export function ApiTaskErrorResponses(options?: {
  includeForbidden?: boolean;
}) {
  const decorators = [
    ApiValidationErrorResponse(),
    ApiUnauthorizedErrorResponse(),
    ApiNotFoundErrorResponse(),
  ];

  if (options?.includeForbidden) {
    decorators.push(ApiForbiddenErrorResponse());
  }

  decorators.push(ApiThrottledErrorResponse());

  return applyDecorators(...decorators);
}
