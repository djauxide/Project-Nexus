# Contributing

## Workflow

1. Fork → branch (`feature/description` or `fix/description`)
2. `make dev` for local stack
3. Write tests — target >80% coverage
4. `make lint` before committing
5. PR requires 2 approvals for backend, 1 for frontend
6. Squash merge to main

## Commit Convention

```
type(scope): description
```

Types: `feat` `fix` `docs` `refactor` `perf` `test` `chore`

Example: `feat(switcher): add T-bar interpolation for smooth transitions`

## Code Standards

- TypeScript: strict mode, functional patterns
- Go: `gofmt`, table-driven tests
- Rust: clippy warnings as errors
- Python: black + isort + mypy

## Security

Never commit secrets. Use `git-secrets` or similar.
Report vulnerabilities to security@nexus.broadcast.
