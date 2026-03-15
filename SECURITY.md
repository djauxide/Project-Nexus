# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 4.x     | ✓ |
| < 4.0   | ✗ |

## Reporting a Vulnerability

Email security@nexus.broadcast with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We aim to respond within 48 hours and patch within 14 days for critical issues.

## Security Practices

- All container images scanned with Trivy on every CI build
- Terraform IaC scanned with Checkov
- Dependencies audited with `npm audit`, `cargo audit`, `safety`
- Zero-trust network policies between all services
- JWT tokens expire after 8 hours
- Secrets managed via Vault in production
