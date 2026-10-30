import assert from "node:assert/strict";
import { decide, shipmentEvent } from "./shipment_report.ts";

const delivered = shipmentEvent.parse({
  shipmentId: "SHP-1042",
  event: "delivered",
  occurredAt: "2026-10-25T08:30:00.000Z",
  proofOfDelivery: "pod-1042.pdf"
});
assert.equal(decide(delivered), "delivered");
assert.equal(decide({ ...delivered, event: "exception", proofOfDelivery: undefined, exceptionCode: "ADDRESS_CHECK" }), "needs_review");
console.log("shipment decision test passed");
