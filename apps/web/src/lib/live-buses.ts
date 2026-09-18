/**
 * How many selected lines the live bus prediction runs for at once, most
 * recently toggled first.
 *
 * This is a cap on *outbound* load, not on rendering. Locating one line costs
 * ~7–15 Moventis requests per variant, and the busiest lines here have six or
 * seven variants — about 95 requests for line 6 alone. Every one of those goes
 * through the same process-wide 5 req/s gate as the stop drawer's own fetches,
 * so selecting the whole network (~250–500 requests) asks for 50–110 s of
 * outbound budget against a 25 s refetch timer. The queue never drains, and
 * because it is FIFO and shared, the visitor who pays for it is whoever tapped
 * a stop next — on someone else's device.
 *
 * Three also keeps the prediction honest in its own terms: the locator compares
 * ETAs across stops against one reference instant, which assumes a call's
 * probes are near-simultaneous. Probes spread over a minute of queue latency
 * describe different fleet states, and the brackets built from them are wrong
 * rather than merely late.
 *
 * Lives here rather than in `use-line-buses.ts` so the copy that explains the
 * cap to the user can read it without importing the tRPC client.
 */
export const MAX_PREDICTED_LINES = 3;
