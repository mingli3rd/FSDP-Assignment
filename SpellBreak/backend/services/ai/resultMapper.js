// Turns the AI team's result format into what the customer screen needs.
// Keeps the ticket rules in one place (never say "safe").

const VERDICT_MAP = {
  scam: "likely_scam",
  suspicious: "some_signs",
  safe: "no_common_signs",
};

function toCustomerResult(final) {
  const verdict = VERDICT_MAP[final.verdict] || "some_signs"; // unknown = be careful

  return {
    verdict,
    confidence: final.confidence,
    scamType: final.scam_type,
    tricks: final.tricks,
    aiSigns: final.ai_generated_signs,
    safeActions: final.safe_actions,
    disclaimer:
      verdict === "no_common_signs"
        ? "No common scam signs found. This doesn't mean it's safe."
        : null,
  };
}

module.exports = { toCustomerResult };