# PageLM

> [!WARNING]
> This branch is not production quality and may contain unstable code.

## Get started

### Installation

```bash
git clone https://github.com/CaviraOSS/PageLM.git --branch develop
cd PageLM
npm run setup

# Linux
cp .env.example .env

# Windows (cmd)
copy .env.example .env
# Windows (powershell)
Copy-Item .env.example .env
```

Setup .env and run with:

Run `npm run build` to compile the TypeScript backend, then `npm run start`.

```bash
npm run build
npm run start
```

### Development

Run `npm i` to install devDependencies, as they are omitted in the main installation. Use `npm run dev` if supported to watch your edits change instantly. However, if `npm run dev` doesn't work on your machine, you can run `npm run serve` and `npm run views:dev` in separate terminals. You can optionally make pull requests to contribute. Please re-check AI-generated code to avoid discrepancies.

This is a monolithic codebase containing both a backend and a frontend. In development mode, the backend server starts on port 2001 and the frontend on port 5173. However, in production (`npm start`), a single web server serves both the frontend and the backend.

Run `npm run build` to compile the frontend into HTML and place it in the backend's static directory. Alternatively, you can host those files on an external web host and connect them to your backend. Make sure to build the frontend before submitting a pull request if your changes include frontend modifications.
