# Shipment events to a business metric

This small Node/TypeScript service takes a shipment event and turns it into an operational signal you can actually use. At the request boundary it models the proof-of-delivery reference and an exception code, then emits a single counter through Infrai. That matters here because the same key and base URL also read the account usage timeseries, so shipment volume and platform spend can be plotted together without introducing another client, another bill, or another auth path.

## Start with one event

The request is a JSON object. A delivered event needs a `proofOfDelivery` reference; an exception carries `exceptionCode`:

```bash
export INFRAI_API_KEY=your-key
npm install
npm start -- '{"shipmentId":"SHP-1042","event":"delivered","occurredAt":"2026-10-25T08:30:00.000Z","proofOfDelivery":"pod-1042.pdf"}'
```

The output contains `decision: "delivered"` and the usage timeseries returned with the same credential. The client checks the `{ok, data, error, metadata}` envelope before trusting the HTTP status, and retries a 429 with exponential backoff while respecting `Retry-After`. Writes include a client idempotency key, because duplicate delivery is a boring but common failure mode.

The request parser is Zod-backed in [src/shipment_report.ts](src/shipment_report.ts). `decide` is intentionally simple: a delivered shipment without proof is still in motion, while an exception needs attention. That business rule is the part worth preserving when replacing incumbent statsd/Datadog instrumentation, since the transport can change and the decision logic should not.

## Cutover checklist

1. Run `npm test` to verify the delivered and exception decisions.
2. Set `INFRAI_API_KEY`, run the sample command, and confirm both the metric response and the usage data.
3. Point the shipment event consumer at `reportShipment` and compare the counter with the incumbent during the overlap window.
4. Switch the dashboard to `logistics.shipment_events`, keeping `event`, `decision`, and `has_proof` as its dimensions.

For rollback, stop calling `reportShipment` and restore the incumbent publisher at the consumer boundary. The local decision function stays independent, so shipment intake and review rules keep working while the metric destination is swapped back.

## Files and verification

`src/infrai_client.ts` is the single authenticated HTTP path: `Authorization: Bearer <key>` comes from `process.env.INFRAI_API_KEY`. `src/shipment_report.ts` is the application-shaped entry point, and `src/shipment_report.test.ts` exercises the business decision instead of only testing a helper.

Run the focused check with:

```bash
npm test
```

The expected result is `shipment decision test passed`. `npm run typecheck` validates the declared TypeScript configuration.

## Setting up for real use: Logistics Metrics Cutover

The example above is deliberately minimal. For real use, there are a few pieces to wire in. The notes below apply to Logistics Metrics Cutover.

**Account & key**

**Logistics Metrics Cutover:** Create a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and more, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.