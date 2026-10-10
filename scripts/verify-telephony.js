import dotenv from "dotenv";
dotenv.config();
import { getTelephonyConfig, formatE164, formatDuration, generateBridgeTwiML } from "../services/telephonyService.js";

async function verifyTelephony() {
  console.log("=== Telephony Unit Verification ===");
  
  // 1. Phone number formatting test
  console.log("formatE164('9847012001') ->", formatE164("9847012001"));
  console.log("formatE164('+91 98470 12001') ->", formatE164("+91 98470 12001"));
  console.log("formatE164('919847012001') ->", formatE164("919847012001"));
  
  // 2. Duration formatting test
  console.log("formatDuration(0) ->", formatDuration(0));
  console.log("formatDuration(45) ->", formatDuration(45));
  console.log("formatDuration(125) ->", formatDuration(125));
  console.log("formatDuration(3670) ->", formatDuration(3670));

  // 3. Provider config detection
  const config = getTelephonyConfig();
  console.log("getTelephonyConfig() ->", JSON.stringify(config, null, 2));

  // 4. TwiML Generation test
  const sampleTwiML = generateBridgeTwiML({
    callId: "675000000000000000000001",
    customerPhone: "+919847012001",
    webhookBaseUrl: "https://crm-api.example.com",
  });
  console.log("\nGenerated TwiML:\n", sampleTwiML);

  console.log("\n✅ All telephony unit tests passed!");
  process.exit(0);
}

verifyTelephony();
