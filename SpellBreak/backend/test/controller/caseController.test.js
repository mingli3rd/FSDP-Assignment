// The model is mocked, so no database is needed. The real caseRules are used.
jest.mock("../../models/caseModel", () => ({
  createCase: jest.fn(),
  listCases: jest.fn(),
  getTriageSeconds: jest.fn(),
  getCaseById: jest.fn(),
  getCaseEvents: jest.fn(),
  applyAction: jest.fn(),
}));

const caseModel = require("../../models/caseModel");
const caseController = require("../../controllers/caseController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const caseRow = (overrides = {}) => ({
  id: 4,
  status: "new",
  resolution: null,
  risk_score: 91,
  amount: 4800,
  amount_note: "S$4,800 to new payee",
  scam_type: "E-commerce",
  looks_like: "E-commerce scam",
  source: "Extension, Smart Pause",
  evidence: "quote",
  signals: '["Pressure"]',
  reporter_name: "Alex Lim",
  assignee_name: null,
  created_at: "2026-11-20T10:00:00",
  updated_at: "2026-11-20T10:00:00",
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("caseController.createCase", () => {
  test("saves the case for the logged-in customer and returns its reference", async () => {
    caseModel.createCase.mockResolvedValue(12);
    const req = { user: { id: 5, role: "customer" }, body: { risk_score: 91, scam_type: "E-commerce" } };
    const res = mockRes();

    await caseController.createCase(req, res);

    expect(caseModel.createCase).toHaveBeenCalledWith(5, req.body, "high");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 12, ref: "RC-0012" }));
  });

  test("returns 500 when saving fails", async () => {
    caseModel.createCase.mockRejectedValue(new Error("db down"));
    const res = mockRes();

    await caseController.createCase({ user: { id: 5 }, body: { risk_score: 10 } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error sending your report" });
  });
});

describe("caseController.listCases", () => {
  test("returns formatted cases and the summary numbers", async () => {
    caseModel.listCases.mockResolvedValue([caseRow(), caseRow({ id: 5, status: "closed", resolution: "released", risk_score: 20, amount: 100 })]);
    caseModel.getTriageSeconds.mockResolvedValue([600]);
    const res = mockRes();

    await caseController.listCases({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.cases).toHaveLength(2);
    expect(body.cases[0].ref).toBe("RC-0004");
    expect(body.summary.open).toBe(1);
    expect(body.summary.medianTriageMinutes).toBe(10);
  });

  test("returns 500 when the database fails", async () => {
    caseModel.listCases.mockRejectedValue(new Error("db down"));
    caseModel.getTriageSeconds.mockResolvedValue([]);
    const res = mockRes();

    await caseController.listCases({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("caseController.getCase", () => {
  test("returns 404 when the case does not exist", async () => {
    caseModel.getCaseById.mockResolvedValue(null);
    const res = mockRes();

    await caseController.getCase({ params: { id: "99" } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Case not found" });
  });

  test("returns the case with its audit trail", async () => {
    caseModel.getCaseById.mockResolvedValue(caseRow());
    caseModel.getCaseEvents.mockResolvedValue([
      { id: 1, event_type: "created", details: null, created_at: "t", actor_name: "Alex Lim" },
    ]);
    const res = mockRes();

    await caseController.getCase({ params: { id: "4" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.case.ref).toBe("RC-0004");
    expect(body.events[0].label).toBe("Customer sent this case to OCBC");
  });
});

describe("caseController.applyAction", () => {
  const req = (body, id = "4") => ({ params: { id }, body, user: { id: 9, role: "employee" } });

  test("returns 404 when the case does not exist", async () => {
    caseModel.getCaseById.mockResolvedValue(null);
    const res = mockRes();

    await caseController.applyAction(req({ action: "contact" }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(caseModel.applyAction).not.toHaveBeenCalled();
  });

  test("rejects releasing a high-risk case without a reason, and writes nothing", async () => {
    caseModel.getCaseById.mockResolvedValue(caseRow({ risk_score: 91 }));
    const res = mockRes();

    await caseController.applyAction(req({ action: "release", note: "" }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(caseModel.applyAction).not.toHaveBeenCalled();
  });

  test("rejects changing a closed case", async () => {
    caseModel.getCaseById.mockResolvedValue(caseRow({ status: "closed", resolution: "scam" }));
    const res = mockRes();

    await caseController.applyAction(req({ action: "release", note: "changed my mind" }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(caseModel.applyAction).not.toHaveBeenCalled();
  });

  test("returns 409 when someone else changed the case first", async () => {
    caseModel.getCaseById.mockResolvedValue(caseRow());
    caseModel.applyAction.mockResolvedValue({ conflict: true });
    const res = mockRes();

    await caseController.applyAction(req({ action: "contact" }), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("applies the action as the logged-in employee and returns the updated case and trail", async () => {
    caseModel.getCaseById
      .mockResolvedValueOnce(caseRow())
      .mockResolvedValueOnce(caseRow({ status: "in_review" }));
    caseModel.applyAction.mockResolvedValue({ conflict: false });
    caseModel.getCaseEvents.mockResolvedValue([
      { id: 2, event_type: "status_change", details: JSON.stringify({ action: "contact", note: "Called" }), created_at: "t", actor_name: "Jia Hui" },
    ]);
    const res = mockRes();

    await caseController.applyAction(req({ action: "contact", note: "Called" }), res);

    expect(caseModel.applyAction).toHaveBeenCalledWith(
      4,
      9,
      expect.objectContaining({ event: "status_change", from: "new", to: "in_review" })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.case.statusLabel).toBe("In review");
    expect(body.events[0].actor).toBe("Jia Hui");
  });

  test("returns 500 when the database fails", async () => {
    caseModel.getCaseById.mockRejectedValue(new Error("db down"));
    const res = mockRes();

    await caseController.applyAction(req({ action: "contact" }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
