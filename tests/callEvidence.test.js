import test from "node:test";
import assert from "node:assert/strict";
import twilio from "twilio";
import Call from "../models/Call.js";
import Lead from "../models/Lead.js";
import { handleDialAction } from "../services/telephonyService.js";
import { logCall, updateCall } from "../controllers/callController.js";
import { verifyTwilioWebhook } from "../middleware/verifyTwilioWebhook.js";

function response() {
  return {
    code: 200,
    status(code) { this.code = code; return this; },
    json(value) { this.value = value; return this; },
  };
}

test("manual call input cannot create provider evidence", async () => {
  const originalCreate = Call.create;
  let stored;
  Call.create = async (data) => { stored = data; return { ...data }; };
  try {
    const res = response();
    await logCall({
      user: { name: "Seller", role: "Sales Executive", _id: "507f1f77bcf86cd799439011" },
      body: {
        name: "Customer", phone: "1234567890", callStatus: "Answered", duration: "02:00",
        callType: "telephony", providerCallId: "FAKE", providerVerifiedAt: new Date(),
        recordingStatus: "Available", recordingSid: "FAKE", executiveId: "attacker",
      },
    }, res);
    assert.equal(res.code, 201);
    assert.equal(stored.callType, "manual");
    assert.equal(stored.providerCallId, undefined);
    assert.equal(stored.providerVerifiedAt, undefined);
    assert.equal(stored.recordingSid, undefined);
    assert.equal(stored.recordingStatus, "Not recorded");
    assert.equal(stored.durationSeconds, 120);
  } finally {
    Call.create = originalCreate;
  }
});

test("call update rejects changing provider outcome", async () => {
  const originalFind = Call.findById;
  Call.findById = async () => ({ callType: "telephony", assigned: "Seller" });
  try {
    const res = response();
    await updateCall({ params: { id: "abc" }, user: { name: "Seller", role: "Manager" }, body: { callStatus: "Answered" } }, res);
    assert.equal(res.code, 400);
  } finally {
    Call.findById = originalFind;
  }
});

test("webhook requires a valid signature for the public URL and form", () => {
  const originalToken = process.env.TWILIO_AUTH_TOKEN;
  const originalBase = process.env.WEBHOOK_BASE_URL;
  process.env.TWILIO_AUTH_TOKEN = "test-secret";
  process.env.WEBHOOK_BASE_URL = "https://crm.example.test";
  try {
    const url = "https://crm.example.test/api/telephony/webhook/status?callId=123&leg=customer";
    const body = { CallSid: "CA123", CallStatus: "no-answer" };
    const signature = twilio.getExpectedTwilioSignature("test-secret", url, body);
    let called = false;
    const req = {
      method: "POST",
      headers: {},
      originalUrl: "/api/telephony/webhook/status?callId=123&leg=customer",
      body,
      get(name) { return name === "X-Twilio-Signature" ? signature : undefined; },
    };
    verifyTwilioWebhook(req, response(), () => { called = true; });
    assert.equal(called, true);
    req.body = { ...body, CallStatus: "completed" };
    const rejected = response();
    verifyTwilioWebhook(req, rejected, () => { called = true; });
    assert.equal(rejected.code, 403);
  } finally {
    if (originalToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = originalToken;
    if (originalBase === undefined) delete process.env.WEBHOOK_BASE_URL;
    else process.env.WEBHOOK_BASE_URL = originalBase;
  }
});


test("verified customer no-answer marks only a new lead Not Connected", async () => {
  const originalCallFind = Call.findOne;
  const originalLeadFind = Lead.findOne;
  const originalLeadUpdate = Lead.findOneAndUpdate;
  const call = {
    _id: "507f1f77bcf86cd799439012",
    leadRef: "507f1f77bcf86cd799439013",
    callType: "telephony",
    providerCallId: "CA-agent",
    providerLeg1Sid: "CA-agent",
    recordingStatus: "Processing",
    async save() {},
  };
  let update;
  Call.findOne = async () => call;
  Lead.findOne = () => ({ select: async () => ({ status: "" }) });
  Lead.findOneAndUpdate = async (query, changes) => { update = { query, changes }; };
  try {
    await handleDialAction({
      callId: call._id,
      body: { CallSid: "CA-agent", DialCallSid: "CA-customer", DialCallStatus: "no-answer" },
    });
    assert.equal(call.callStatus, "Missed");
    assert.ok(call.providerVerifiedAt instanceof Date);
    assert.equal(update.query.status, "");
    assert.equal(update.changes.$set.status, "Not Connected");
    assert.equal(update.changes.$push.statusAudit.source, "provider");
    assert.equal(update.changes.$push.statusAudit.evidenceCallId, call._id);
    update = null;
    Lead.findOne = () => ({ select: async () => null }); // Lead has since progressed.
    await handleDialAction({
      callId: call._id,
      body: { CallSid: "CA-agent", DialCallSid: "CA-customer", DialCallStatus: "no-answer" },
    });
    assert.equal(update, null);
  } finally {
    Call.findOne = originalCallFind;
    Lead.findOne = originalLeadFind;
    Lead.findOneAndUpdate = originalLeadUpdate;
  }
});
