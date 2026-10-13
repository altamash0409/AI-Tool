# Consider Pie — SuiteScript AI Converter

A high-performance SuiteScript migration workspace built by **Consider Pie** using React, TypeScript, TanStack Start, and Tailwind CSS. Built with a clean, responsive, VS Code-inspired interface for NetSuite developers and administrators.

![Consider Pie Logo](/logo.png)

## Overview

Consider Pie automatically modernizes legacy SuiteScript 1.0 and 2.0/2.x scripts into clean, production-grade SuiteScript 2.1 AMD modules:

- **Script Type Preservation**: Strictly preserves script types (`User Event`, `Client`, `Suitelet`, `Map/Reduce`, `Scheduled`, `RESTlet`, `Portlet`, `Mass Update`).
- **Module Mapping**: Automatically replaces legacy `nlapi*` calls with modular SuiteScript 2.1 APIs (`N/record`, `N/search`, `N/log`, `N/runtime`, `N/currentRecord`, etc.).
- **ES6+ Modernization**: Upgrades function signatures, context objects, block scoping (`const`/`let`), arrow functions, and object shorthand syntax.
- **Automated Validation**: Real validation engine checking annotations, module imports, entry-point exports, function signatures, legacy API remnants, and parameter options.
- **Privacy by Default**: Scripts are converted and validated locally inside your browser. No proprietary code is sent to third-party servers.

## Workspace Layout

1. **Configuration Sidebar**: Select source version (1.0 / 2.0), target version (2.1), script type, and conversion options (comments preservation, modern syntax, governance checks).
2. **Editor Workspace**: Side-by-side synchronized source and converted code editors with token highlighting, line numbers, paste, upload, copy, and download.
3. **Insights Sidebar**: Detailed conversion summary, API diffs, script checkpoints, governance limit warnings, and full automated Validation Report with suggested fixes.

## Development

```sh
npm install
npm run dev
```

### Running Tests

```sh
npm test
```

### Production Build

```sh
npm run build
```
