import twilio from "twilio";

// Twilio signs the exact public URL and form parameters sent to our webhook.
export function verifyTwilioWebhook(req, res, next) {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const signature = req.get("X-Twilio-Signature");
  const configuredBase = process.env.WEBHOOK_BASE_URL || process.env.SERVER_BASE_URL || process.env.PUBLIC_URL;
  const proto = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const base = (configuredBase || `${proto}://${req.get("host")}`).replace(/\/+$/, "");
  const url = `${base}${req.originalUrl}`;
  const params = req.method === "POST" ? req.body : {};

  if (!token || !signature || !twilio.validateRequest(token, signature, url, params)) {
    return res.status(403).json({ success: false, message: "Invalid provider signature" });
  }
  next();
}
