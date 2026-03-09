# Deployment V2

## Stack and lifecycle
- Backend: Go Console service
- DB: SQLite
- CLI: bb
- Lifecycle: install / upgrade / uninstall via install.sh
- Service manager: systemd (`bb.service` primary)

## Deployment constraints
- Remove bb-person service/runtime.
- Keep console-centric deployment flow.
- Keep release packaging and operational commands:
  - bb server
  - bb status
  - bb logs
  - bb restart
  - bb doctor
  - bb version
  - bb tls
