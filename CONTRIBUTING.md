# Contributing to PageLM

Thanks for your interest in improving PageLM! This guide explains how to propose changes while keeping the project healthy and predictable.

## Getting Started
- **Discuss first**: Open an issue or join the existing discussion before large changes. This reduces duplicate work and ensures the direction aligns with the project roadmap.
- **Set up locally**: Run `npm install` at the repository root. The frontend lives in `frontend/`, the backend in `backend/`.
- **Node version**: Use the version declared in `package.json` (`"engines": { "node": ">=21.18.0" }`). Managing versions with `nvm`/`fnm` helps.

## Development Workflow
1. **Branching**: Create a topic branch from `main` named `<user>/<feature>` or `<user>/<bugfix>`.
2. **Code style**:
   - TypeScript/JavaScript should pass `npm run build` (root and frontend).
   - Keep files ASCII unless they already use other encodings.
   - Favor small, focused commits with meaningful messages.
3. **Tests & checks**:
   - Backend: `npm run build` (root).
   - Frontend: `npm run build` in `frontend/`.
   - Add targeted tests or scripts when introducing behaviour that can regress.
4. **Documentation**: Update README, inline comments, or other docs when behavior or APIs change.

## Pull Request Checklist
- Reference related issues.
- Provide a concise summary of the change and any follow-up work.
- Note manual testing steps and results.
- Keep PRs atomic; independent changes should be separate PRs.

## Review Expectations
- Reviews focus on correctness, clarity, security, performance, and maintainability.
- Address feedback promptly; push follow-up commits instead of force-pushing so history is clear.
- Nullure (morven) is the final reviewer for architectural or governance-impacting changes.

Thank you for helping build a great learning companion! 🎓
