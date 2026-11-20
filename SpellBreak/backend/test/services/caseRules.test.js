const rules = require("../../services/caseRules");

describe("caseRules.planAction", () => {
  test("contacting a new case moves it to in_review and records the action", () => {
    const plan = rules.planAction({ status: "new", risk: 91 }, "contact", "Called the customer");
    expect(plan.ok).toBe(true);
    expect(plan.event).toBe("status_change");
    expect(plan.from).toBe("new");
    expect(plan.to).toBe("in_review");
    expect(plan.resolution).toBeNull();
    expect(plan.details).toEqual({ action: "contact", from: "new", to: "in_review", note: "Called the customer" });
  });

  test("escalating writes an 'escalated' event", () => {
    const plan = rules.planAction({ status: "in_review", risk: 70 }, "escalate", "");
    expect(plan.ok).toBe(true);
    expect(plan.event).toBe("escalated");
    expect(plan.to).toBe("escalated");
    expect(plan.details.note).toBeUndefined();
  });

  test("marking a case as scam closes it with resolution 'scam'", () => {
    const plan = rules.planAction({ status: "escalated", risk: 88 }, "mark_scam");
    expect(plan.ok).toBe(true);
    expect(plan.to).toBe("closed");
    expect(plan.resolution).toBe("scam");
  });

  test("releasing a low-risk case needs no reason", () => {
    const plan = rules.planAction({ status: "new", risk: 32 }, "release", "");
    expect(plan.ok).toBe(true);
    expect(plan.to).toBe("closed");
    expect(plan.resolution).toBe("released");
  });

  test("releasing a high-risk case without a reason is rejected", () => {
    const plan = rules.planAction({ status: "new", risk: 91 }, "release", "   ");
    expect(plan.ok).toBe(false);
    expect(plan.status).toBe(400);
  });

  test("releasing a high-risk case with a too-short reason is rejected", () => {
    const plan = rules.planAction({ status: "new", risk: 80 }, "release", "ok");
    expect(plan.ok).toBe(false);
    expect(plan.status).toBe(400);
  });

  test("releasing a high-risk case with a reason is allowed", () => {
    const plan = rules.planAction({ status: "new", risk: 91 }, "release", "Customer confirmed with the real seller");
    expect(plan.ok).toBe(true);
    expect(plan.details.note).toBe("Customer confirmed with the real seller");
  });

  test("a closed case cannot change status again", () => {
    for (const action of ["contact", "escalate", "mark_scam", "release"]) {
      const plan = rules.planAction({ status: "closed", risk: 10 }, action, "reason here");
      expect(plan.ok).toBe(false);
      expect(plan.status).toBe(409);
    }
  });

  test("actions that don't apply to the current status are rejected", () => {
    expect(rules.planAction({ status: "in_review", risk: 50 }, "contact").status).toBe(409);
    expect(rules.planAction({ status: "escalated", risk: 50 }, "escalate").status).toBe(409);
    expect(rules.planAction({ status: "escalated", risk: 50 }, "contact").status).toBe(409);
  });

  test("a note needs text, never changes status, and works on closed cases", () => {
    expect(rules.planAction({ status: "new", risk: 50 }, "note", "  ").status).toBe(400);

    const plan = rules.planAction({ status: "closed", risk: 50 }, "note", "Follow-up call done");
    expect(plan.ok).toBe(true);
    expect(plan.event).toBe("note");
    expect(plan.from).toBe("closed");
    expect(plan.to).toBe("closed");
  });

  test("an unknown action is rejected", () => {
    const plan = rules.planAction({ status: "new", risk: 50 }, "delete");
    expect(plan.ok).toBe(false);
    expect(plan.status).toBe(400);
  });
});

describe("caseRules helpers", () => {
  test("caseRef pads the id", () => {
    expect(rules.caseRef(41)).toBe("RC-0041");
    expect(rules.caseRef(12345)).toBe("RC-12345");
  });

  test("riskBand and priorityFromRisk use the 80 / 50 thresholds", () => {
    expect(rules.riskBand(80)).toBe("high");
    expect(rules.riskBand(79)).toBe("med");
    expect(rules.riskBand(50)).toBe("med");
    expect(rules.riskBand(49)).toBe("low");
    expect(rules.priorityFromRisk(91)).toBe("high");
    expect(rules.priorityFromRisk(61)).toBe("medium");
    expect(rules.priorityFromRisk(5)).toBe("low");
  });

  test("statusLabel reads the resolution for closed cases", () => {
    expect(rules.statusLabel("new")).toBe("New");
    expect(rules.statusLabel("in_review")).toBe("In review");
    expect(rules.statusLabel("escalated")).toBe("Escalated");
    expect(rules.statusLabel("closed", "scam")).toBe("Marked scam");
    expect(rules.statusLabel("closed", "released")).toBe("Released");
  });

  test("median handles empty, odd and even lists", () => {
    expect(rules.median([])).toBeNull();
    expect(rules.median([5])).toBe(5);
    expect(rules.median([9, 1, 5])).toBe(5);
    expect(rules.median([1, 2, 3, 10])).toBe(2.5);
  });
});

describe("caseRules.formatEvent", () => {
  test("reads the JSON details and the actor's name", () => {
    const e = rules.formatEvent({
      id: 7,
      event_type: "status_change",
      details: JSON.stringify({ action: "release", from: "new", to: "closed", note: "Confirmed with seller" }),
      created_at: "2026-11-20T10:00:00",
      actor_name: "Jia Hui",
    });
    expect(e.label).toBe("Marked safe and released");
    expect(e.note).toBe("Confirmed with seller");
    expect(e.actor).toBe("Jia Hui");
  });

  test("a 'created' event is credited to the customer when there is no name", () => {
    const e = rules.formatEvent({ id: 1, event_type: "created", details: null, created_at: "x", actor_name: null });
    expect(e.label).toBe("Customer sent this case to OCBC");
    expect(e.actor).toBe("Customer");
  });

  test("plain-text details from hand-typed rows still show as a note", () => {
    const e = rules.formatEvent({ id: 2, event_type: "note", details: "called back", created_at: "x", actor_name: null });
    expect(e.note).toBe("called back");
    expect(e.actor).toBe("OCBC staff");
  });
});

describe("caseRules.formatCase", () => {
  const row = {
    id: 3,
    status: "new",
    resolution: null,
    risk_score: 88,
    amount: "20500.00",
    amount_note: "S$20,500 over 3 transfers",
    scam_type: "Investment",
    looks_like: "Deepfake investment ad",
    source: "Extension, Smart Pause",
    evidence: "quote",
    signals: '["Deepfake video","Top-up to withdraw"]',
    reporter_name: "Marcus Ong",
    assignee_name: null,
    created_at: "a",
    updated_at: "b",
  };

  test("maps database columns to the API shape", () => {
    const c = rules.formatCase(row);
    expect(c.ref).toBe("RC-0003");
    expect(c.risk).toBe(88);
    expect(c.amount).toBe(20500);
    expect(c.signals).toEqual(["Deepfake video", "Top-up to withdraw"]);
    expect(c.customer).toBe("Marcus Ong");
    expect(c.statusLabel).toBe("New");
    expect(c.allowedActions).toEqual(["contact", "escalate", "mark_scam", "release"]);
  });

  test("copes with missing amount and broken signals JSON", () => {
    const c = rules.formatCase({ ...row, amount: null, signals: "not json" });
    expect(c.amount).toBeNull();
    expect(c.signals).toEqual([]);
  });
});

describe("caseRules.summarise", () => {
  const cases = [
    { status: "new", risk: 91, amount: 4800 },
    { status: "in_review", risk: 89, amount: 12000 },
    { status: "new", risk: 61, amount: 300 },
    { status: "new", risk: 86, amount: null },
    { status: "closed", risk: 32, amount: 999 },
  ];

  test("counts open and high-risk cases and totals the open amount at stake", () => {
    const s = rules.summarise(cases, []);
    expect(s.bands).toEqual({ all: 5, high: 3, med: 1, low: 1 });
    expect(s.open).toBe(4);
    expect(s.highOpen).toBe(3);
    expect(s.amountAtStake).toBe(17100); // closed case's 999 is not at stake
  });

  test("median triage time is in whole minutes, at least 1, or null with no data", () => {
    expect(rules.summarise(cases, []).medianTriageMinutes).toBeNull();
    expect(rules.summarise(cases, [600, 1200, 300]).medianTriageMinutes).toBe(10);
    expect(rules.summarise(cases, [10]).medianTriageMinutes).toBe(1);
  });
});
