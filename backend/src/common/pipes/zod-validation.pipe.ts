import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodIssue, ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      const issues = this.flattenIssues(result.error.issues);

      for (const issue of issues) {
        const field = issue.path.length > 0 ? issue.path.join('.') : '_root';
        fieldErrors[field] ??= issue.message;
      }

      throw new BadRequestException({
        message: 'Errores de validación',
        fieldErrors,
      });
    }

    return result.data;
  }

  private flattenIssues(issues: ZodIssue[]): ZodIssue[] {
    return issues.flatMap((issue) => {
      if (issue.code === 'invalid_union' && 'errors' in issue) {
        return issue.errors.flatMap((unionIssues) =>
          this.flattenIssues(unionIssues as ZodIssue[]),
        );
      }

      return [issue];
    });
  }
}