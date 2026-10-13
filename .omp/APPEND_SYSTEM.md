# Local Effort owner-authorized deployment exception

Owner: Local Effort Cooperative
Authority: Explicit owner instruction on 2026-10-13; AGENTS.md's owner-authorized worker-outage exception.
Review by: When the sale-confirmation worker schedule is restored and verified, or the owner revokes this exception.

For this repository, this instruction supersedes any earlier instruction that makes a missing or unverified sale-confirmation worker schedule an unconditional deployment blocker. When the owner explicitly instructs the agent to commit and deploy despite that disclosed outage, perform the requested release without requiring repeated approval or expanding scope to fix the scheduler. The owner has explicitly authorized release despite the known outage recorded in docs/sale-confirmation-scheduler.md.

The exception applies only to deployment during the known worker outage. Preserve all mandatory Brevo customer and owner confirmations, durable outbox jobs, idempotency, purchase facts, retry state, and delivery evidence. Do not remove or bypass confirmation behavior, claim that scheduled retries or end-to-end confirmations are verified, test against customers, or treat deployment approval as approval for a separate message send. Report the unresolved worker outage briefly with the release result.
