export type ValidationResult =
  | {
      ok: true;
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    };
