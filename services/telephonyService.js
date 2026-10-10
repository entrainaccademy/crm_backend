import Call from "../models/Call.js";
import Lead from "../models/Lead.js";

/**
 * Helper to format phone number to E.164 standard
 */
export function formatE164(phone, defaultCountryCode = "+91") {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[^\d+]/g, "").trim();
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.startsWith("00")) {
    return "+" + cleaned.slice(2);
  }
  if (cleaned.length === 10) {
    return `${defaultCountryCode}${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

/**
 * Format duration in seconds to "mm:ss" or "hh:mm:ss"
 */
export function formatDuration(seconds) {
  const secNum = parseInt(seconds, 10);
  if (isNaN(secNum) || secNum <= 0) return "00:00";
  const hours = Math.floor(secNum / 3600);
  const minutes = Math.floor((secNum % 3600) / 60);
  const secs = secNum % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(secs).padStart(2, "0"),
    ].join(":");
  }
  return [
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0"),
  ].join(":");
}

/**
 * Get Telephony provider configuration status
 */
export function getTelephonyConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  const webhookBaseUrl = (
    process.env.WEBHOOK_BASE_URL ||
    process.env.SERVER_BASE_URL ||
    process.env.PUBLIC_URL ||
    ""
  ).replace(/\/+$/, "");

  const missing = [];
  if (!accountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!authToken) missing.push("TWILIO_AUTH_TOKEN");
  if (!twilioNumber) missing.push("TWILIO_PHONE_NUMBER");

  const isConfigured = missing.length === 0;

  return {
    isConfigured,
    provider: "twilio",
    accountSid: accountSid ? `${accountSid.slice(0, 6)}...${accountSid.slice(-4)}` : null,
    twilioNumber: twilioNumber || null,
    webhookBaseUrl: webhookBaseUrl || null,
    missing,
    recordingNoticeEnabled: process.env.RECORDING_NOTICE_ENABLED !== "false",
  };
}

/**
 * Initiate an Outbound Click-to-Call Bridge via Twilio
 */
export async function initiateOutboundBridge({
  leadId,
  customerPhone,
  customerName,
  service = "",
  executiveUser,
  agentPhone = "",
  notes = "",
  reqHost = "",
}) {
  const config = getTelephonyConfig();
  if (!config.isConfigured) {
    const error = new Error("Call recording setup required: Telephony provider credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) are not configured.");
    error.code = "PROVIDER_NOT_CONFIGURED";
    error.missing = config.missing;
    throw error;
  }

  const executivePhone = agentPhone || executiveUser.phone;
  if (!executivePhone) {
    const error = new Error("Your registered phone number is missing. Please add your mobile number in your profile or enter it to initiate the call.");
    error.code = "EXECUTIVE_PHONE_REQUIRED";
    throw error;
  }

  const formattedAgentPhone = formatE164(executivePhone);
  const formattedCustomerPhone = formatE164(customerPhone);
  const twilioNumber = formatE164(process.env.TWILIO_PHONE_NUMBER);

  if (!formattedCustomerPhone) {
    const error = new Error("Customer phone number is invalid or missing.");
    error.code = "INVALID_CUSTOMER_PHONE";
    throw error;
  }

  // Resolve webhook base URL
  let baseUrl = config.webhookBaseUrl;
  if (!baseUrl && reqHost) {
    const protocol = reqHost.includes("localhost") || reqHost.includes("127.0.0.1") ? "http" : "https";
    baseUrl = `${protocol}://${reqHost}`;
  }

  // Find linked lead if available
  let leadRef = null;
  let numericLeadId = undefined;
  if (leadId) {
    const lead = await Lead.findOne({
      $or: [{ customId: Number(leadId) }, { _id: leadId }],
    });
    if (lead) {
      leadRef = lead._id;
      numericLeadId = lead.customId;
    }
  }

  const now = new Date();
  const callDate = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const callTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  // 1. Create Call record in DB
  const call = await Call.create({
    leadId: numericLeadId,
    leadRef,
    name: customerName || "Customer",
    phone: formattedCustomerPhone,
    agentPhone: formattedAgentPhone,
    direction: "Outgoing",
    duration: "00:00",
    durationSeconds: 0,
    callStatus: "Initiated",
    callType: "telephony",
    callDate,
    callTime,
    startedAt: now,
    service: service || "",
    assigned: executiveUser.name,
    executiveId: executiveUser._id,
    notes: typeof notes === "string" ? notes.trim() : "",
    provider: "twilio",
    recordingStatus: "Processing",
  });

  // 2. Initiate Call to Agent Leg via Twilio Voice API
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Calls.json`;
  const twimlUrl = `${baseUrl}/api/telephony/webhook/twiml?callId=${call._id}&to=${encodeURIComponent(formattedCustomerPhone)}`;
  const statusCallbackUrl = `${baseUrl}/api/telephony/webhook/status?callId=${call._id}&leg=agent`;

  const postParams = new URLSearchParams();
  postParams.append("To", formattedAgentPhone);
  postParams.append("From", twilioNumber);
  postParams.append("Url", twimlUrl);
  postParams.append("StatusCallback", statusCallbackUrl);
  postParams.append("StatusCallbackMethod", "POST");
  postParams.append("StatusCallbackEvent", "initiated");
  postParams.append("StatusCallbackEvent", "ringing");
  postParams.append("StatusCallbackEvent", "answered");
  postParams.append("StatusCallbackEvent", "completed");

  const basicAuth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString("base64");

  const twilioRes = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: postParams.toString(),
  });

  const twilioData = await twilioRes.json();

  if (!twilioRes.ok) {
    call.callStatus = "Failed";
    call.recordingStatus = "Failed";
    call.recordingError = twilioData.message || "Twilio call initiation failed";
    await call.save();

    const err = new Error(twilioData.message || "Failed to initiate call via telephony provider.");
    err.details = twilioData;
    throw err;
  }

  // Update Call with Twilio SID
  call.providerCallId = twilioData.sid;
  call.providerLeg1Sid = twilioData.sid;
  await call.save();

  // Add activity log to lead if linked
  if (leadRef) {
    try {
      await Lead.findByIdAndUpdate(leadRef, {
        $push: {
          activities: {
            text: `Recorded call initiated by ${executiveUser.name} to ${formattedCustomerPhone}`,
            time: "Just now",
            type: "call",
          },
        },
      });
    } catch (e) {
      console.warn("Could not update lead activity:", e.message);
    }
  }

  return {
    success: true,
    callId: call._id,
    providerCallId: twilioData.sid,
    status: "Initiated",
    message: "Call initiated. Your phone will ring shortly.",
    call,
  };
}

/**
 * Generate TwiML for connecting the executive to the customer with dual-side recording and consent announcement
 */
export function generateBridgeTwiML({ callId, customerPhone, webhookBaseUrl = "" }) {
  const twilioNumber = formatE164(process.env.TWILIO_PHONE_NUMBER);
  const formattedCustomerPhone = formatE164(customerPhone);
  const noticeEnabled = process.env.RECORDING_NOTICE_ENABLED !== "false";
  const noticeText =
    process.env.RECORDING_NOTICE_TEXT ||
    "This call is being recorded for quality and training purposes. Connecting you now.";

  const recordingCallback = `${webhookBaseUrl}/api/telephony/webhook/recording?callId=${callId}`;
  const dialActionCallback = `${webhookBaseUrl}/api/telephony/webhook/dial-action?callId=${callId}`;
  const customerStatusCallback = `${webhookBaseUrl}/api/telephony/webhook/status?callId=${callId}&leg=customer`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${
    noticeEnabled
      ? `<Say voice="Polly.Aditi" language="en-IN">${escapeXml(noticeText)}</Say>`
      : ""
  }
  <Dial
    callerId="${escapeXml(twilioNumber)}"
    record="record-from-answer-dual"
    recordingStatusCallback="${escapeXml(recordingCallback)}"
    recordingStatusCallbackMethod="POST"
    action="${escapeXml(dialActionCallback)}"
    method="POST"
    timeLimit="14400"
    timeout="35"
  >
    <Number
      statusCallback="${escapeXml(customerStatusCallback)}"
      statusCallbackMethod="POST"
      statusCallbackEvent="initiated ringing answered completed"
    >${escapeXml(formattedCustomerPhone)}</Number>
  </Dial>
</Response>`;
}

/**
 * Escape XML entities
 */
function escapeXml(unsafe) {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Handle Twilio Status Callback (Leg 1 or Leg 2)
 */
export async function handleStatusCallback({ callId, leg = "agent", body = {} }) {
  const query = callId ? { _id: callId } : { providerCallId: body.CallSid };
  const call = await Call.findOne(query);
  if (!call) return null;

  const twilioStatus = (body.CallStatus || "").toLowerCase();
  const durationSec = parseInt(body.CallDuration || body.Duration || "0", 10);

  if (leg === "agent") {
    if (twilioStatus === "ringing") {
      if (call.callStatus === "Initiated") call.callStatus = "Ringing";
    } else if (twilioStatus === "in-progress") {
      if (call.callStatus === "Initiated" || call.callStatus === "Ringing") {
        call.callStatus = "In Progress";
      }
    } else if (twilioStatus === "busy") {
      call.callStatus = "Busy";
      if (call.recordingStatus === "Processing") call.recordingStatus = "Not recorded";
      call.endedAt = new Date();
    } else if (twilioStatus === "no-answer") {
      call.callStatus = "Missed";
      if (call.recordingStatus === "Processing") call.recordingStatus = "Not recorded";
      call.endedAt = new Date();
    } else if (twilioStatus === "failed" || twilioStatus === "canceled") {
      call.callStatus = "Disconnected";
      if (call.recordingStatus === "Processing") call.recordingStatus = "Not recorded";
      call.endedAt = new Date();
    } else if (twilioStatus === "completed") {
      if (durationSec > 0 && (!call.durationSeconds || call.durationSeconds === 0)) {
        call.durationSeconds = durationSec;
        call.duration = formatDuration(durationSec);
      }
      call.endedAt = new Date();
    }
  } else if (leg === "customer") {
    if (twilioStatus === "ringing") {
      call.callStatus = "Ringing";
    } else if (twilioStatus === "in-progress") {
      call.callStatus = "In Progress";
    } else if (twilioStatus === "completed") {
      if (durationSec > 0) {
        call.durationSeconds = durationSec;
        call.duration = formatDuration(durationSec);
        call.callStatus = "Answered";
      }
      call.endedAt = new Date();
    }
  }

  await call.save();
  return call;
}

/**
 * Handle Dial Action Callback (Triggered when customer leg ends)
 */
export async function handleDialAction({ callId, body = {} }) {
  const query = callId ? { _id: callId } : { providerCallId: body.CallSid };
  const call = await Call.findOne(query);
  if (!call) return null;

  const dialStatus = (body.DialCallStatus || "").toLowerCase();
  const dialDurationSec = parseInt(body.DialCallDuration || "0", 10);

  if (body.DialCallSid) {
    call.providerLeg2Sid = body.DialCallSid;
  }

  if (dialStatus === "completed" || dialStatus === "answered") {
    call.callStatus = "Answered";
    if (dialDurationSec > 0) {
      call.durationSeconds = dialDurationSec;
      call.duration = formatDuration(dialDurationSec);
    }
  } else if (dialStatus === "busy") {
    call.callStatus = "Busy";
    if (call.recordingStatus === "Processing") call.recordingStatus = "Not recorded";
  } else if (dialStatus === "no-answer") {
    call.callStatus = "Missed";
    if (call.recordingStatus === "Processing") call.recordingStatus = "Not recorded";
  } else if (dialStatus === "failed" || dialStatus === "canceled") {
    call.callStatus = "Disconnected";
    if (call.recordingStatus === "Processing") call.recordingStatus = "Not recorded";
  }

  call.endedAt = new Date();
  await call.save();
  return call;
}

/**
 * Handle Recording Callback (When recording audio is ready)
 */
export async function handleRecordingCallback({ callId, body = {} }) {
  const query = callId
    ? { _id: callId }
    : {
        $or: [
          { providerCallId: body.CallSid },
          { providerLeg1Sid: body.CallSid },
          { providerLeg2Sid: body.CallSid },
        ],
      };

  const call = await Call.findOne(query);
  if (!call) return null;

  const recordingStatus = (body.RecordingStatus || "").toLowerCase();
  const recordingSid = body.RecordingSid;
  const recordingUrl = body.RecordingUrl;
  const recordingDurationSec = parseInt(body.RecordingDuration || "0", 10);

  if (recordingStatus === "completed" && recordingUrl) {
    call.recordingSid = recordingSid;
    call.recordingUrl = recordingUrl;
    call.recordingDuration = recordingDurationSec;
    call.recordingStatus = "Available";
    call.recordingError = "";

    // If call duration is 0, update with recording duration
    if ((!call.durationSeconds || call.durationSeconds === 0) && recordingDurationSec > 0) {
      call.durationSeconds = recordingDurationSec;
      call.duration = formatDuration(recordingDurationSec);
      if (call.callStatus !== "Answered") call.callStatus = "Answered";
    }
  } else if (recordingStatus === "failed" || recordingStatus === "absent") {
    call.recordingStatus = "Failed";
    call.recordingError = body.RecordingErrorMessage || `Recording ${recordingStatus}`;
  }

  await call.save();
  return call;
}

/**
 * Fetch and stream private recording audio from Twilio with Basic Auth
 */
export async function fetchRecordingStream(call, rangeHeader = "") {
  const config = getTelephonyConfig();
  if (!config.isConfigured) {
    throw new Error("Telephony provider credentials are not configured.");
  }

  let mediaUrl = "";
  if (call.recordingUrl) {
    mediaUrl = call.recordingUrl.endsWith(".mp3")
      ? call.recordingUrl
      : `${call.recordingUrl}.mp3`;
  } else if (call.recordingSid) {
    mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${call.recordingSid}.mp3`;
  } else {
    throw new Error("No recording media reference available for this call.");
  }

  const basicAuth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString("base64");

  const headers = {
    Authorization: `Basic ${basicAuth}`,
  };
  if (rangeHeader) {
    headers["Range"] = rangeHeader;
  }

  const response = await fetch(mediaUrl, {
    headers,
  });

  if (!response.ok && response.status !== 206) {
    throw new Error(`Failed to fetch recording media from provider: HTTP ${response.status}`);
  }

  return response;
}
