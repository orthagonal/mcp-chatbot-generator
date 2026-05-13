import type { CompileOptions } from "../types/compileOptions.js";
import { defaultCompileOptions } from "../types/compileOptions.js";

export function resolveCompileOptions(
  options?: CompileOptions
): Required<CompileOptions> {
  return {
    ...defaultCompileOptions,
    ...options
  };
}
