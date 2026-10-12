# Suitescript Forge

Build a modern SuiteScript AI Converter web app using React, TypeScript, and Tailwind CSS. Use a premium dark navy and white theme with a clean, responsive, VS Code-inspired interface.

Create a three-column layout:

Left sidebar: Source version (SuiteScript 1.0 / 2.0), target version (SuiteScript 2.1), script type dropdown (User Event, Client, Suitelet, Map/Reduce, Scheduled, RESTlet, Client Script, etc.), and conversion options.

Center workspace: Source and converted code editors with syntax highlighting, line numbers, paste/upload, copy, download, and a prominent Convert button.

Right sidebar: AI conversion summary, API changes, script checkpoints, warnings, errors, governance risks, and manual testing recommendations.

Use reusable components, Lucide icons, and a professional developer-tool UI. Keep the implementation lightweight and avoid unnecessary dependencies.

Build functional UI interactions with sample scripts. Structure the code for future AI API integration, but do not build a complex backend yet. Never fake successful conversions; clearly label demo conversions until a real conversion engine is connected. Prioritize speed, clean code, and a polished desktop-first design.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://suitescript-forge.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d06f2ec9-abda-4bc5-95e3-49459657d6b1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
