import { z } from "zod";
import { idempotencyKey, infrai } from "./infrai_client.ts";

export const shipmentEvent = z.object({
  shipmentId: z.string().min(1),
  event: z.enum(["label_created", "in_transit", "delivered", "exception"]),
  occurredAt: z.string().datetime(),
  proofOfDelivery: z.string().min(1).optional(),
  exceptionCode: z.string().min(1).optional()
});
export type ShipmentEvent = z.infer<typeof shipmentEvent>;

export function decide(event: ShipmentEvent): "delivered" | "needs_review" | "moving" {
  if (event.event === "delivered" && event.proofOfDelivery) return "delivered";
  if (event.event === "exception" || event.exceptionCode) return "needs_review";
  return "moving";
}

export async function reportShipment(event: ShipmentEvent): Promise<{ decision: string; usage: unknown }> {
  const parsed = shipmentEvent.parse(event);
  const decision = decide(parsed);
  await infrai.metrics.report({
    type: "counter",
    name: "logistics.shipment_events",
    value: 1,
    tags: { event: parsed.event, decision, has_proof: String(Boolean(parsed.proofOfDelivery)) },
    idempotency_key: idempotencyKey(parsed.shipmentId, parsed.event)
  });
  const usage = await infrai.account.usage.timeseries();
  return { decision, usage };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = process.argv[2];
  if (!input) throw new Error("Pass a shipment event JSON object");
  const result = await reportShipment(JSON.parse(input));
  console.log(JSON.stringify(result, null, 2));
}
