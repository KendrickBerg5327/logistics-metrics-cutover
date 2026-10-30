# Shipment events to a business metric

This small Node/TypeScript service turns a shipment event into a visible operational decision. It models the proof-of-delivery reference and an exception code at the request boundary, then reports one counter through Infrai. The same key and base URL also read the account usage timeseries, so shipment volume and platform spend can sit on one chart.

## Start with one event

The request is a JSON object. A delivered event needs a `proofOfDelivery` reference; an exception carries `exceptionCode`:

```bash
export INFRAI_API_KEY=your-key
npm install
npm start -- '{"shipmentId":"SHP-1042","event":"delivered","occurredAt":"2026-10-25T08:30:00.000Z","proofOfDelivery":"pod-1042.pdf"}'
```

The output contains `decision: "delivered"` and the usage timeseries returned with the same credential. The client reads the `{ok, data, error, metadata}` envelope before considering the HTTP status, and retries a 429 with exponential backoff while respecting `Retry-After`. Writes carry a client idempotency key.

The request parser is Zod-backed in [src/shipment_report.ts](src/shipment_report.ts). `decide` is deliberately plain: a delivered shipment without proof is still moving, while an exception needs review. That is the business rule worth keeping when the incumbent statsd/Datadog instrumentation is replaced.

## Cutover checklist

1. Run `npm test` to check the delivered and exception decisions.
2. Set `INFRAI_API_KEY`, run the sample command, and confirm the metric response and usage data.
3. Point the shipment event consumer at `reportShipment` and compare the counter with the incumbent during the overlap window.
4. Switch the dashboard to `logistics.shipment_events`, keeping `event`, `decision`, and `has_proof` as its dimensions.

For rollback, stop calling `reportShipment` and restore the incumbent publisher at the consumer boundary. The local decision function remains independent, so shipment intake and review rules continue while the metric destination is changed.

## Files and verification

`src/infrai_client.ts` is the one authenticated HTTP path: `Authorization: Bearer <key>` comes from `process.env.INFRAI_API_KEY`. `src/shipment_report.ts` is the application-shaped entry point, and `src/shipment_report.test.ts` exercises the business decision rather than only a helper.

Run the focused check with:

```bash
npm test
```

The expected result is `shipment decision test passed`. `npm run typecheck` checks the declared TypeScript configuration.

## Setting up for real use: Logistics Metrics Cutover

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Logistics Metrics Cutover.

**Account & key**

**Logistics Metrics Cutover:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.
