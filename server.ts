/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Local persistent database file
const DB_FILE = path.join(process.cwd(), "database.json");

// Types for database schema
interface DBStructure {
  admissions: any[];
  careers: any[];
  contacts: any[];
  enquiries: any[];
}

// Initial smart mock data so the dashboard is visually striking right away
const INITIAL_DB: DBStructure = {
  admissions: [
    {
      id: "adm_1",
      fullName: "Aarav Mehra",
      mobile: "+91 98765 43210",
      email: "aarav.mehra@gmail.com",
      course: "CSIR NET Chemistry",
      city: "Bhubaneswar",
      message: "I want to apply for the early bird 50% scholarship. Please share admission steps.",
      submittedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
      status: "Pending"
    },
    {
      id: "adm_2",
      fullName: "Sneha Iyer",
      mobile: "+91 91234 56789",
      email: "sneha.iyer@outlook.com",
      course: "IIT JAM Chemistry",
      city: "New Delhi",
      message: "MSc chemistry aspirant here. Looking for early enrollment details.",
      submittedAt: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours ago
      status: "Contacted"
    }
  ],
  careers: [
    {
      id: "car_1",
      name: "Dr. Vikram Adiga",
      mobile: "+91 88888 77777",
      email: "vikram.adiga@science.org",
      position: "Chemistry Faculty (IIT JAM)",
      resumeUrl: "Resume_Dr_Vikram_Adiga.pdf",
      message: "I hold a Ph.D. from IIT Bombay in Physical Chemistry. Eager to take up the senior lecturer posting.",
      submittedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      status: "Received"
    },
    {
      id: "car_2",
      name: "Rishi Kant",
      mobile: "+91 77777 66666",
      email: "rishikant91@gmail.com",
      position: "Student Career Counsellor",
      resumeUrl: "Resume_Rishi_Kant.docx",
      message: "6 years experience managing admissions and student guidance at top national coachings.",
      submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      status: "Reviewed"
    }
  ],
  contacts: [
    {
      id: "con_1",
      name: "Maanas Shaurya",
      mobile: "+91 94444 33333",
      email: "maanas.s@gmail.com",
      subject: "Hostel Facility Cost",
      message: "Is food fee included in the PG facility tie-ups for NEET dropouts?",
      submittedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      status: "New"
    },
    {
      id: "con_2",
      name: "Prita Das",
      mobile: "+91 95555 22222",
      email: "das.prita@yahoo.com",
      subject: "GATE Chemistry evening batches",
      message: "Do you offer Saturday-Sunday offline intensive batches for working corporate chemists?",
      submittedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      status: "Resolved"
    }
  ],
  enquiries: [
    {
      id: "enq_1",
      name: "Yashvardhan Malik",
      mobile: "+91 96666 11111",
      email: "yash.malik@rediffmail.com",
      course: "GATE Chemistry",
      message: "Need structure of GATE mock exams and numerical typing guides.",
      source: "Course Card",
      submittedAt: new Date(Date.now() - 3600000 * 96).toISOString(),
      status: "Interested"
    },
    {
      id: "enq_2",
      name: "Tanya Sen",
      mobile: "+91 99380 75054",
      email: "tanya.sen@gmail.com",
      course: "NEET",
      message: "Interested in the 2-Year offline integrated NEET biology coaching. Send brochure.",
      source: "Chatbot",
      submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: "New"
    }
  ]
};

// Help load/save database
function loadDB(): DBStructure {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Failed to parse DB file, using fallback INITIAL_DB", error);
  }
  // Initialize with initial mockup records
  saveDB(INITIAL_DB);
  return INITIAL_DB;
}

function saveDB(data: DBStructure) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write to DB file", error);
  }
}

// Credentials
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "naiserpassword", // Under secure instructions, simple username/password requested.
  token: "naiser_session_secure_token_2026_0B3D91"
};

// Route helpers
function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

// Authorize middleware
function authenticateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${ADMIN_CREDENTIALS.token}`) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized access to Admin API. Please log in again." });
}

// ---- API REST ENDPOINTS ----

// 1. Submit admission request
app.post("/api/admissions", (req, res) => {
  const { fullName, mobile, email, course, city, message } = req.body;
  if (!fullName || !mobile || !email || !course) {
    return res.status(400).json({ error: "Please fill in all mandatory fields (Name, Mobile, Email, and Course)." });
  }

  const db = loadDB();
  const entry = {
    id: generateId("adm"),
    fullName,
    mobile,
    email,
    course,
    city: city || "Not provided",
    message: message || "No custom message",
    submittedAt: new Date().toISOString(),
    status: "Pending"
  };

  db.admissions.unshift(entry);
  saveDB(db);

  return res.status(201).json({ success: true, id: entry.id, message: "Admission request registered successfully!" });
});

// 2. Submit Career Application
app.post("/api/careers", (req, res) => {
  const { name, mobile, email, position, resumeName, message } = req.body;
  if (!name || !mobile || !email || !position) {
    return res.status(400).json({ error: "Name, Mobile, Email, and Position are required fields." });
  }

  const db = loadDB();
  const entry = {
    id: generateId("car"),
    name,
    mobile,
    email,
    position,
    resumeUrl: resumeName || "Resume_Submitted.pdf",
    message: message || "No extra message",
    submittedAt: new Date().toISOString(),
    status: "Received"
  };

  db.careers.unshift(entry);
  saveDB(db);

  return res.status(201).json({ success: true, id: entry.id, message: "Career application received!" });
});

// 3. Submit Contact message
app.post("/api/contacts", (req, res) => {
  const { name, mobile, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "Please provide Name, Email, Subject, and your Message." });
  }

  const db = loadDB();
  const entry = {
    id: generateId("con"),
    name,
    mobile: mobile || "Not specified",
    email,
    subject,
    message,
    submittedAt: new Date().toISOString(),
    status: "New"
  };

  db.contacts.unshift(entry);
  saveDB(db);

  return res.status(201).json({ success: true, id: entry.id, message: "Message sent! We will contact you soon." });
});

// 4. Submit General course enquiry (from Course cards)
app.post("/api/enquiries", (req, res) => {
  const { name, mobile, email, course, message, source } = req.body;
  if (!name || !mobile || !email || !course) {
    return res.status(400).json({ error: "Mandatory fields: Name, Phone, Email, and Course." });
  }

  const db = loadDB();
  const entry = {
    id: generateId("enq"),
    name,
    mobile,
    email,
    course,
    message: message || "General Course Enquiry",
    source: source || "General Query",
    submittedAt: new Date().toISOString(),
    status: "New"
  };

  db.enquiries.unshift(entry);
  saveDB(db);

  return res.status(201).json({ success: true, id: entry.id, message: "Enquiry recorded. Our science counsellor will ring you soon!" });
});

// 5. Admin Login verify
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    return res.json({ success: true, token: ADMIN_CREDENTIALS.token });
  }
  return res.status(401).json({ error: "Invalid admin username or password!" });
});

// 6. Admin Get Submissions
app.get("/api/admin/submissions", authenticateAdmin, (req, res) => {
  const db = loadDB();
  return res.json({
    admissions: db.admissions,
    careers: db.careers,
    contacts: db.contacts,
    enquiries: db.enquiries
  });
});

// 7. Admin update Status
app.put("/api/admin/submissions/:type/:id", authenticateAdmin, (req, res) => {
  const { type, id } = req.params;
  const { status, remarks } = req.body;

  const db = loadDB();
  const collection = db[type as keyof DBStructure];

  if (!collection) {
    return res.status(400).json({ error: `Invalid category: ${type}` });
  }

  const itemIdx = collection.findIndex((x) => x.id === id);
  if (itemIdx === -1) {
    return res.status(404).json({ error: "Form submission record not found." });
  }

  // Update properties
  collection[itemIdx].status = status;
  if (remarks !== undefined) {
    collection[itemIdx].remarks = remarks;
  }
  collection[itemIdx].updatedAt = new Date().toISOString();

  saveDB(db);
  return res.json({ success: true, message: "Record status updated successfully." });
});

// 8. Admin delete Record
app.delete("/api/admin/submissions/:type/:id", authenticateAdmin, (req, res) => {
  const { type, id } = req.params;

  const db = loadDB();
  const collection = db[type as keyof DBStructure];

  if (!collection) {
    return res.status(400).json({ error: "Invalid category code" });
  }

  const filtered = collection.filter((x) => x.id !== id);
  db[type as keyof DBStructure] = filtered;

  saveDB(db);
  return res.json({ success: true, message: "Submission record deleted physically." });
});

// 9. Admin view Stats
app.get("/api/admin/dashboard", authenticateAdmin, (req, res) => {
  const db = loadDB();

  // Aggregate stats
  const totalEnquiries = db.enquiries.length;
  const admissionRequests = db.admissions.length;
  const careerApplications = db.careers.length;
  const contactLeads = db.contacts.length;

  // Course-wise enquiry aggregator
  const courseWiseEnquiries: Record<string, number> = {
    "CSIR NET Chemistry": 0,
    "GATE Chemistry": 0,
    "IIT JAM Chemistry": 0,
    "NEET": 0,
    "General / Other": 0
  };

  // Compile from enquiries
  db.enquiries.forEach((item) => {
    const matchedKey = Object.keys(courseWiseEnquiries).find(
      (k) => item.course && item.course.toLowerCase().includes(k.toLowerCase().split(" ")[0])
    );
    if (matchedKey) {
      courseWiseEnquiries[matchedKey]++;
    } else {
      courseWiseEnquiries["General / Other"]++;
    }
  });

  // Compile from admissions too for robust counts
  db.admissions.forEach((item) => {
    const matchedKey = Object.keys(courseWiseEnquiries).find(
      (k) => item.course && item.course.toLowerCase().includes(k.toLowerCase().split(" ")[0])
    );
    if (matchedKey) {
      courseWiseEnquiries[matchedKey]++;
    } else {
      courseWiseEnquiries["General / Other"]++;
    }
  });

  return res.json({
    totalEnquiries,
    admissionRequests,
    careerApplications,
    contactLeads,
    courseWiseEnquiries
  });
});

// 10. SMART CHATBOT ENDPOINT with fallback
app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message content required" });
  }

  // Pre-baked system instructions for NAISER Chatbot
  const defaultSystemInstruction = `
    You are 'Naisera', the interactive Virtual AI assistant for NAISER (Napthoquine Institute of Science Education and Research). 
    NAISER provides pure offline classroom program coachings for premium scientific exams: 
    1. CSIR NET Chemistry
    2. GATE Chemistry
    3. IIT JAM Chemistry
    4. NEET (Physics, Chemistry, Biology)

    Use a professional, warm, encouraging, and scientific tone, indicating that all programs are pure classroom physical experiences.
    Promote our special 50% early scholarship program for first two batches.
    Encourage the user to leave their details via 'Apply Now' or 'Enquire Now' so Dr. Sudhanshu Verma's counselor team can reach out physical.
    Keep responses to the point, structured as short beautiful bullet points.
  `;

  // Fallback replies built in-house for offline mode or empty API keys
  const getOfflineReply = (msg: string): string => {
    const queryLower = msg.toLowerCase();
    if (queryLower.includes("course") || queryLower.includes("chemistry") || queryLower.includes("subject")) {
      return "NAISER offers premium, intensive Chemistry Programs including CSIR NET Chemistry, GATE Chemistry, IIT JAM Chemistry, as well as NEET Science prep. All programs are pure offline classes. Would you like us to call you to explain the syllabus structure?";
    }
    if (queryLower.includes("admission") || queryLower.includes("fee") || queryLower.includes("apply") || queryLower.includes("join")) {
      return "Admissions for our new Offline Classroom programs are open. We are running a limited 50% early discount Scholarship for our first two batches of the local sessions! Head over to the 'Admissions' menu to apply instantly.";
    }
    if (queryLower.includes("scholarship") || queryLower.includes("discount") || queryLower.includes("offer")) {
      return "Exciting Offer! 🎉 We are providing an ultimate flat 50% Tuition Fee Scholarship for the first two batches of CSIR NET, GATE, IIT JAM & NEET. Submit an Admission form now to lock your seat!";
    }
    if (queryLower.includes("faculty") || queryLower.includes("teacher") || queryLower.includes("director")) {
      return "Our classrooms are mentored exclusively by senior scientific minds, led by Director Dr. Sudhanshu Verma (PhD from IIT Kanpur, CSIR NET JRF Rank 12 holder). Learn science through fundamental proofs instead of rote memorization!";
    }
    if (queryLower.includes("contact") || queryLower.includes("phone") || queryLower.includes("address") || queryLower.includes("location") || queryLower.includes("map")) {
      return "Feel free to visit our campus! We are based at Plot no- A145, In front of Maternity Care Hospital, Saheed Nagar, Bhubaneswar, 751007. Phone: (+91)-9938075054, Email: reachus@naiser.in. Drop in anytime between 9:00 AM and 6:00 PM for physical guidance.";
    }
    return `Hello! Welcome to NAISER (Napthoquine Institute of Science Education & Research). 👋 We provide top-class pure offline coaching for CSIR NET Chemistry, GATE, IIT JAM Chemistry, and NEET. Flat 50% early bird scholarships are active today! How can I guide you regarding courses or admissions?`;
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // Elegant, fast offline reply
    return res.json({ text: getOfflineReply(message) });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const parsedHistory = (history || []).map((h: any) => ({
      role: h.sender === "user" ? "user" : "model",
      parts: [{ text: h.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [...parsedHistory, { role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction: defaultSystemInstruction,
        temperature: 0.7
      }
    });

    return res.json({ text: response.text || getOfflineReply(message) });
  } catch (error) {
    console.warn("Gemini API call failed, using graceful offline reply fallback.", error);
    return res.json({ text: getOfflineReply(message) });
  }
});

// Serve static assets in production, otherwise Vite handles in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NAISER SERVER ACTIVE] Listening securely on port http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
  });
}

startServer();
