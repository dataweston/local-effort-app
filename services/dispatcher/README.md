# Local Office Dispatcher

This service will manage courier integrations for Dispatch, Uber Direct, and Olo-originated orders. It will expose adapters that conform to a shared `CourierAdapter` interface and surface normalized delivery updates back to the core API.

## Integration notes
- Maintain idempotency keys and retry policies for create/cancel operations
- Verify and parse incoming webhooks for each vendor
- Publish delivery status changes via the shared webhook-out channel
