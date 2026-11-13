"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 3000);

function loadLocalEnvironment() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadLocalEnvironment();

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(value));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > 16_384) {
        reject(new Error("Request is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Please submit a valid request."));
      }
    });
    request.on("error", reject);
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function normalizeServicePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const normalized = { ...payload };
  if (typeof normalized.Email === "string" && typeof normalized.email !== "string") {
    normalized.email = normalized.Email;
  }
  return normalized;
}

function validateMeeting(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "Please submit a valid request.";
  const required = ["name", "gender", "phone", "department", "description", "meetingType"];
  for (const key of required) {
    if (typeof payload[key] !== "string" || !payload[key].trim()) return "Please complete all required fields.";
  }
  if (!["Female", "Male", "Prefer not to say"].includes(payload.gender)) return "Choose a valid gender option.";
  if (!["facility", "outside"].includes(payload.meetingType)) return "Choose a valid meeting type.";
  if (payload.meetingType === "outside" && (typeof payload.location !== "string" || !payload.location.trim())) {
    return "Please provide the meeting location.";
  }
  if (payload.name.length > 120 || payload.phone.length > 30 || payload.department.length > 120 ||
      payload.description.length > 3000 || (payload.location && payload.location.length > 240)) {
    return "One or more fields exceed the allowed length.";
  }
  return null;
}

function validateServiceRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "Please submit a valid request.";
  const normalized = normalizeServicePayload(payload);

  const schemas = {
    contact: {
      required: ["name", "gender", "email", "department", "description"],
      fields: { name: 120, gender: 40, email: 120, department: 120, description: 3000 },
      options: {}
    },
    software: {
      required: ["name", "gender", "phone", "department", "websiteType", "timeline", "features", "description"],
      fields: {
        name: 120, gender: 40, phone: 30, department: 120, websiteType: 80,
        timeline: 120, features: 3000, description: 3000, domainHosting: 1000
      },
      options: { websiteType: ["Business or organization", "Personal portfolio", "Online store", "School or educational", "Other"] }
    },
    hardware: {
      required: ["name", "gender", "phone", "deviceType", "makeModel", "issue"],
      fields: {
        name: 120, gender: 40, phone: 30, department: 120, deviceType: 80,
        makeModel: 160, issue: 3000, details: 1500
      },
      options: { deviceType: ["Laptop", "Desktop computer", "Printer", "Other computer appliance"] }
    },
    portal: {
      required: ["name", "gender", "email", "phone", "registrationNumber", "department", "issueType", "description"],
      fields: {
        name: 120, gender: 40, email: 120, phone: 30, registrationNumber: 40,
        department: 120, issueType: 80, description: 3000
      },
      options: {
        issueType: [
          "Cannot log in",
          "Password or account access",
          "Registration or course issue",
          "Payment or fee issue",
          "Results or academic record",
          "Other"
        ]
      }
    }
  };

  const schema = Object.hasOwn(schemas, normalized.serviceType) ? schemas[normalized.serviceType] : null;
  if (!schema) return "Choose a valid service request type.";
  if (schema.required.some((key) => typeof normalized[key] !== "string" || !normalized[key].trim())) {
    return "Please complete all required fields.";
  }
  if (!["Female", "Male", "Prefer not to say"].includes(normalized.gender)) return "Choose a valid gender option.";
  for (const [key, maxLength] of Object.entries(schema.fields)) {
    if (normalized[key] !== undefined && (typeof normalized[key] !== "string" || normalized[key].length > maxLength)) {
      return "One or more fields are invalid or exceed the allowed length.";
    }
  }
  for (const [key, choices] of Object.entries(schema.options)) {
    const fieldLabel = {
      websiteType: "website type",
      deviceType: "device type",
      issueType: "portal issue"
    }[key];
    if (!choices.includes(normalized[key])) return `Choose a valid ${fieldLabel}.`;
  }
  return null;
}

async function sendEmailRequest(subject, heading, details) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.INNOVATION_EMAIL || "Ict.@unn.edu.ng";
  if (!apiKey || !from) {
    return { status: 503, body: { error: "Email is not configured yet. Please contact the ICT Center directly." } };
  }

  const text = details.map(([label, value]) => `${label}: ${value}`).join("\n\n");
  const html = `<h2>${escapeHtml(heading)}</h2>${details.map(([label, value]) =>
    `<p><strong>${escapeHtml(label)}:</strong><br>${escapeHtml(value).replace(/\r?\n/g, "<br>")}</p>`
  ).join("")}`;

  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html
      }),
      signal: AbortSignal.timeout(12_000)
    });
  } catch (error) {
    console.error("Resend request failed:", error.message);
    return { status: 502, body: { error: "The email service could not be reached. Please try again later." } };
  }

  if (!response.ok) {
    const providerMessage = await response.text();
    console.error(`Resend returned ${response.status}: ${providerMessage.slice(0, 500)}`);
    return { status: 502, body: { error: "The email service could not send your request. Please try again later." } };
  }

  return { status: 200, body: { message: "Request sent." } };
}

function meetingDetails(payload) {
  const typeLabel = payload.meetingType === "outside" ? "On-site meeting" : "Facility meeting";
  return [
    ["Meeting type", typeLabel],
    ["Name", payload.name.trim()],
    ["Gender", payload.gender],
    ["Phone number", payload.phone.trim()],
    ["Department / company", payload.department.trim()],
    ...(payload.meetingType === "outside" ? [["Location", payload.location.trim()]] : []),
    ["Meeting description", payload.description.trim()]
  ];
}

function serviceRequestDetails(payload) {
  const email = typeof payload.email === "string" ? payload.email : payload.Email;
  const labels = {
    name: "Name",
    gender: "Gender",
    email: "Email",
    phone: "Phone number",
    department: "Department / company",
    websiteType: "Website type",
    timeline: "Expected timeline",
    features: "Pages and features",
    description: payload.serviceType === "contact" ? "Description" : "Project description",
    domainHosting: "Domain or hosting details",
    deviceType: "Device type",
    makeModel: "Make and model",
    issue: "Issue description",
    details: "Additional details",
    registrationNumber: "Student registration number",
    issueType: "Portal issue"
  };

  return Object.entries(labels)
    .filter(([key]) => {
      if (key === "email") return typeof email === "string" && email.trim();
      return typeof payload[key] === "string" && payload[key].trim();
    })
    .map(([key, label]) => [label, key === "email" ? email.trim() : payload[key].trim()]);
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function serveStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(root, `.${requestedPath}`);

  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    sendJson(response, 400, { error: "Invalid path." });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && ["/api/meeting-requests", "/api/service-requests"].includes(request.url)) {
    let payload;
    try {
      payload = await readJson(request);
    } catch (error) {
      if (!response.writableEnded && !response.destroyed) sendJson(response, 400, { error: error.message });
      return;
    }

    const normalizedPayload = normalizeServicePayload(payload);
    if (request.url === "/api/meeting-requests") {
      const validationError = validateMeeting(payload);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }

      const heading = `New ${payload.meetingType === "outside" ? "on-site" : "facility"} meeting request`;
      const subject = `Meeting request — ${payload.name.trim()}`;
      const details = meetingDetails(payload);
      const result = await sendEmailRequest(subject, heading, details);
      sendJson(response, result.status, result.body);
      return;
    }

    const validationError = validateServiceRequest(normalizedPayload);
    if (validationError) {
      sendJson(response, 400, { error: validationError });
      return;
    }

    const heading = normalizedPayload.serviceType === "contact"
      ? "New contact message"
      : `New ${normalizedPayload.serviceType} unit request`;
    const subject = `${normalizedPayload.serviceType === "contact" ? "Contact" : normalizedPayload.serviceType} request — ${normalizedPayload.name.trim()}`;
    const details = serviceRequestDetails(normalizedPayload);
    const result = await sendEmailRequest(subject, heading, details);
    sendJson(response, result.status, result.body);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  serveStatic(request, response);
});

server.listen(port, () => {
  console.log(`ICT Innovation Center is available at http://localhost:${port}`);
});
