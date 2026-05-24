# Security Policy

Open Meet handles authentication, JWT issuance, refresh cookies, meeting access, admin accounts, LiveKit credentials, and other infrastructure secrets. Please report security issues responsibly and privately.

## Supported versions

This project is currently pre-1.0. Security fixes are applied to the latest code on the default branch. Older commits, forks, and unpublished local deployments should be assumed unsupported unless a maintainer states otherwise.

| Version | Supported |
| --- | --- |
| Default branch (latest commit) | Yes |
| Older branches or commits | No |

## Reporting a vulnerability

Do not open a public GitHub issue for security vulnerabilities.

Report vulnerabilities privately by email:

- `surajkashyap9911@gmail.com`

Please include:

- A short description of the issue and affected area
- Reproduction steps or a proof of concept
- Expected impact and any attack prerequisites
- The commit, branch, or deployment context you tested against
- Any suggested remediation if you have one

If possible, use the subject line:

`[SECURITY] Open Meet vulnerability report`

## What to avoid in reports

- Do not include real passwords, refresh tokens, JWTs, API secrets, SMTP credentials, or production database dumps.
- Redact sensitive logs and screenshots before sending them.
- Do not post exploit details publicly until a fix is available and coordinated.

## Response process

The maintainer will aim to:

- Acknowledge receipt within 72 hours
- Confirm whether the report is in scope and reproducible
- Share status updates while the issue is being triaged or fixed
- Coordinate disclosure timing when a report is valid

## Good-faith testing

Please:

- Avoid accessing data that does not belong to you
- Avoid denial-of-service, spam, or destructive testing against shared deployments
- Use test accounts and local environments whenever possible
- Stop testing once you confirm you can demonstrate impact

## In-scope examples

The following areas are especially relevant:

- Authentication and session handling
- JWT or refresh-token flaws
- Admin authorization bypasses
- Meeting access-control issues
- File upload or storage vulnerabilities
- Secret leakage from configuration, logs, or CI
- Docker, Redis, LiveKit, or webhook misconfiguration with security impact

Thank you for helping keep Open Meet safe for self-hosted deployments and contributors.
