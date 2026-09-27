/** What a shopper is told about returns: "[N]-day return policy", or "No returns allowed". */
export const returnsLabel = (returns) =>
  (returns?.allowed ? `${returns.windowDays}-day return policy` : 'No returns allowed');
