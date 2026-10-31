function assessTransferRisk({ amount, recipientIsNew, recentScamSignal }) {
  // Placeholder risk scoring: replace with real rules/model.
  let score = 0;
  if (amount > 1000) score += 1;
  if (recipientIsNew) score += 1;
  if (recentScamSignal) score += 2;

  return {
    score,
    requiresFriction: score >= 2,
  };
}

module.exports = { assessTransferRisk };
