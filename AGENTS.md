# Consider Pie — Development Architecture

## Core Guidelines
- Keep the converter adapter and typed sample fixtures in a browser-safe module separate from the UI so conversion services operate independently from editor controls.
- Use a textarea with a synchronized token-highlighted layer for editable code to avoid introducing a heavy editor dependency.
- Invalidate output whenever source or conversion settings change, and run conversions through the SuiteScript 2.1 engine with automated AST/regex validation.
