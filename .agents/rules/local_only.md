---
trigger: always_on
---

# Local‑Only Execution Constraint

- **Never** invoke any AWS CLI commands, Terraform commands, Docker commands, or any other cloud/container tooling **unless the user explicitly asks for them**.
- When encountering scripts that contain such commands (e.g., `scripts/deploy-frontend.sh`), the agent must:
  - Replace the command with a harmless stub such as `echo "[local‑stub] <original command>"` **or**
  - Emit a warning and skip execution, ensuring the script still succeeds locally.
- If a required artifact (e.g., `index.html`) is missing, emit a warning rather than exiting with an error.
- This rule applies globally across the entire workspace and overrides any behavior that would otherwise run external deployment commands.

*Rationale*: The user has indicated they will handle all Terraform and AWS operations manually and wants the assistant to operate strictly in a local‑only mode.
