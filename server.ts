import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Synchronized local sync store file
const STORE_FILE = path.join(process.cwd(), "sync-store.json");

interface SyncPayload {
  pin: string;
  data: any;
  createdAt: number;
}

let syncStore: Record<string, SyncPayload> = {};

// Load previous sync store if exists
try {
  if (fs.existsSync(STORE_FILE)) {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    syncStore = JSON.parse(raw);
    console.log(`[Cloud Sync] Loaded ${Object.keys(syncStore).length} active sync pins from storage.`);
  }
} catch (err) {
  console.log("[Cloud Sync] No existing sync-store.json found, starting fresh.");
}

// Function to save sync store
function saveSyncStore() {
  try {
    const expiryAge = 48 * 60 * 60 * 1000; // 48 hours validity
    const now = Date.now();
    let cleaned = false;

    for (const pin in syncStore) {
      if (now - syncStore[pin].createdAt > expiryAge) {
        delete syncStore[pin];
        cleaned = true;
      }
    }

    fs.writeFileSync(STORE_FILE, JSON.stringify(syncStore, null, 2), "utf-8");
    if (cleaned) {
      console.log("[Cloud Sync] Cleaned expired pins and saved storage.");
    }
  } catch (err) {
    console.error("[Cloud Sync] Failed to write sync store to disk", err);
  }
}

// API Routes
// API Routes
const ACCOUNTS_FILE = path.join(process.cwd(), "web-sync-accounts.json");
let accountsStore: Record<string, { email: string; passcode: string; payload: any; updatedAt: number; history?: Array<{ payload: any; updatedAt: number }> }> = {};

// Load previous accounts store if exists
try {
  if (fs.existsSync(ACCOUNTS_FILE)) {
    const raw = fs.readFileSync(ACCOUNTS_FILE, "utf-8");
    accountsStore = JSON.parse(raw);
    console.log(`[Web Sync] Loaded ${Object.keys(accountsStore).length} registered sync accounts from storage.`);

    // Server-side cleanup of misspelled names to sync with the client changes
    let anyCleaned = false;
    const corrections: Record<string, string> = {
      "Cuddalore Court Building SO": "Cuddalore Court Buildings SO",
      "Cuddalore Court Buildings SO- ok": "Cuddalore Court Buildings SO",
      "Cuddalore Court Buildings SO-ok": "Cuddalore Court Buildings SO",
      "Cuddalore OT Bazaar SO - ok": "Cuddalore OT Bazaar SO",
      "Cuddalore OT Bazaar SO- ok": "Cuddalore OT Bazaar SO",
      "Cuddalore OT Bazaar SO-ok": "Cuddalore OT Bazaar SO",
      "Cuddalore OT Bazzar SO": "Cuddalore OT Bazaar SO",
      "Cuddalore Public offices SO": "Cuddalore Public Offices SO",
      "Cuddalore Public Offices SO - ok": "Cuddalore Public Offices SO",
      "Cuddalore Public Offices SO- ok": "Cuddalore Public Offices SO",
      "Cuddalore Public Offices SO-ok": "Cuddalore Public Offices SO",
      "Tirupadiripuliyur west SO": "Tirupadiripuliyur West SO",
      "Tirupadiripuliyur West SO- ok": "Tirupadiripuliyur West SO",
      "Tirupadiripuliyur West SO-ok": "Tirupadiripuliyur West SO"
    };

    const cleanOfficeSpelling = (name: string): string => {
      if (!name) return name;
      const trimmed = name.trim();
      if (corrections[trimmed]) return corrections[trimmed];
      let clean = trimmed;
      if (clean.endsWith("- ok")) {
        clean = clean.substring(0, clean.length - 4).trim();
      } else if (clean.endsWith("-ok")) {
        clean = clean.substring(0, clean.length - 3).trim();
      } else if (clean.endsWith(" - ok")) {
        clean = clean.substring(0, clean.length - 5).trim();
      }
      if (corrections[clean]) return corrections[clean];
      return clean;
    };

    for (const email in accountsStore) {
      const account = accountsStore[email];
      if (account && account.payload) {
        const payload = account.payload;
        for (const key in payload) {
          const val = payload[key];
          if (typeof val === "string") {
            try {
              if (val.startsWith("[") || val.startsWith("{")) {
                const parsed = JSON.parse(val);
                let valChanged = false;

                const cleanObject = (obj: any): any => {
                  if (obj && typeof obj === "object") {
                    if (Array.isArray(obj)) {
                      return obj.map(cleanObject);
                    }
                    const newObj: any = {};
                    for (const k in obj) {
                      const v = obj[k];
                      if (typeof v === "string") {
                        const cleaned = cleanOfficeSpelling(v);
                        if (cleaned !== v) {
                          newObj[k] = cleaned;
                          valChanged = true;
                        } else {
                          newObj[k] = v;
                        }
                      } else if (v && typeof v === "object") {
                        newObj[k] = cleanObject(v);
                      } else {
                        newObj[k] = v;
                      }
                    }
                    return newObj;
                  }
                  return obj;
                };

                const cleanedParsed = cleanObject(parsed);
                let finalParsed = cleanedParsed;
                
                if (key.endsWith("offices_db") && Array.isArray(cleanedParsed)) {
                  const seen = new Map<string, any>();
                  cleanedParsed.forEach((item: any) => {
                    if (item && item.fromOffice && item.toOffice) {
                      const from = item.fromOffice;
                      const to = item.toOffice;
                      const dKey = `${from.toLowerCase()} -> ${to.toLowerCase()}`;
                      const existing = seen.get(dKey);
                      if (!existing) {
                        seen.set(dKey, item);
                      } else {
                        valChanged = true;
                        seen.set(dKey, {
                          ...existing,
                          distanceBus: item.distanceBus || existing.distanceBus,
                          distanceBike: item.distanceBike || existing.distanceBike,
                          durationBus: item.durationBus || existing.durationBus,
                          durationBike: item.durationBike || existing.durationBike,
                        });
                      }
                    }
                  });
                  finalParsed = Array.from(seen.values());
                }

                if (valChanged) {
                  payload[key] = JSON.stringify(finalParsed);
                  anyCleaned = true;
                }
              } else {
                const cleaned = cleanOfficeSpelling(val);
                if (cleaned !== val) {
                  payload[key] = cleaned;
                  anyCleaned = true;
                }
              }
            } catch (e) {
              // Ignore parse errors, leave as is
            }
          }
        }
      }
    }

    if (anyCleaned) {
      console.log("[Web Sync] Performed spelling cleanup of office names in accounts database.");
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accountsStore, null, 2), "utf-8");
    }
  }
} catch (err) {
  console.log("[Web Sync] No existing web-sync-accounts.json found, starting fresh.");
}

// Function to save accounts store
function saveAccountsStore() {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accountsStore, null, 2), "utf-8");
  } catch (err) {
    console.error("[Web Sync] Failed to write accounts store to disk", err);
  }
}

// Web Storage Register or Login
app.post("/api/web-storage/register-or-login", (req, res) => {
  try {
    const { email: rawEmail, passcode } = req.body;
    if (!rawEmail || !passcode) {
      return res.status(400).json({ success: false, message: "Email/Username and passcode are required." });
    }

    const email = rawEmail.toLowerCase().trim();
    const cleanPasscode = String(passcode).trim();

    if (email.length < 3 || cleanPasscode.length < 3) {
      return res.status(400).json({ success: false, message: "Email/Username and passcode must both be at least 3 characters." });
    }

    const existingAccount = accountsStore[email];
    if (existingAccount) {
      // Login flow: verify password
      if (existingAccount.passcode !== cleanPasscode) {
        return res.status(401).json({ 
          success: false, 
          message: "Incorrect passcode for this account. Each Username or Email has a secured passcode. Please try again or use a different unique ID." 
        });
      }
      return res.json({ 
        success: true, 
        isNew: false, 
        payload: existingAccount.payload,
        history: existingAccount.history || [],
        updatedAt: existingAccount.updatedAt || Date.now(),
        message: "Logged in successfully! Pulling latest web storage data..." 
      });
    } else {
      // Registration flow: create new account on first login
      accountsStore[email] = {
        email,
        passcode: cleanPasscode,
        payload: null,
        updatedAt: Date.now(),
        history: []
      };
      saveAccountsStore();
      console.log(`[Web Sync] Registered new account: ${email}`);
      return res.json({ 
        success: true, 
        isNew: true, 
        payload: null,
        history: [],
        updatedAt: accountsStore[email].updatedAt,
        message: "New Cloud Web Space created successfully! Your current Local data will be synced automatically." 
      });
    }
  } catch (error: any) {
    console.error("[Web Sync] Register or Login error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Web Storage Synchronous Backup Upload
app.post("/api/web-storage/save", (req, res) => {
  try {
    const { email: rawEmail, passcode, payload } = req.body;
    if (!rawEmail || !passcode || !payload) {
      return res.status(400).json({ success: false, message: "Missing required sync upload fields." });
    }

    const email = rawEmail.toLowerCase().trim();
    const cleanPasscode = String(passcode).trim();

    const account = accountsStore[email];
    if (account) {
      // Verify passcode
      if (account.passcode !== cleanPasscode) {
        return res.status(401).json({ success: false, message: "Incorrect passcode. Server backup rejected." });
      }
      
      // Keep up to 5 rolling historical backups before overwriting active payload
      if (account.payload) {
        if (!account.history) {
          account.history = [];
        }
        
        // Only backup if the payload changed
        const isIdentical = JSON.stringify(account.payload) === JSON.stringify(payload);
        if (!isIdentical) {
          account.history.unshift({
            payload: account.payload,
            updatedAt: account.updatedAt
          });
          if (account.history.length > 5) {
            account.history = account.history.slice(0, 5);
          }
        }
      }
      
      account.payload = payload;
      account.updatedAt = Date.now();
    } else {
      // If server file cleared but user is sending, auto-recreate
      accountsStore[email] = {
        email,
        passcode: cleanPasscode,
        payload,
        updatedAt: Date.now(),
        history: []
      };
    }
    
    saveAccountsStore();
    return res.json({ 
      success: true, 
      message: "Workspace backup synced to persistent cloud storage successfully!",
      updatedAt: accountsStore[email].updatedAt,
      history: accountsStore[email].history || []
    });
  } catch (error: any) {
    console.error("[Web Sync] Save error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/cloud-sync/upload", (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.metadata) {
      return res.status(400).json({ success: false, message: "Invalid sync payload data." });
    }

    // Generate a unique 6-digit sync PIN
    let pin = "";
    let attempts = 0;
    while (attempts < 100) {
      const num = Math.floor(100000 + Math.random() * 900000);
      pin = num.toString();
      if (!syncStore[pin]) break;
      attempts++;
    }

    syncStore[pin] = {
      pin,
      data,
      createdAt: Date.now()
    };

    saveSyncStore();

    console.log(`[Cloud Sync] Created Sync PIN ${pin} for name: ${data.metadata.name || "Anonymous User"}`);
    return res.json({ success: true, pin });
  } catch (error: any) {
    console.error("[Cloud Sync] Upload error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/cloud-sync/download/:pin", (req, res) => {
  try {
    const pin = (req.params.pin || "").trim().replace(/\s+/g, "");
    const entry = syncStore[pin];

    if (!entry) {
      return res.status(404).json({ success: false, message: "Sync PIN not found or has expired." });
    }

    // Check if expired
    const expiryAge = 48 * 60 * 60 * 1000;
    if (Date.now() - entry.createdAt > expiryAge) {
      delete syncStore[pin];
      saveSyncStore();
      return res.status(404).json({ success: false, message: "Sync PIN not found or has expired." });
    }

    console.log(`[Cloud Sync] Successful sync download for PIN ${pin}`);
    return res.json({ success: true, data: entry.data });
  } catch (error: any) {
    console.error("[Cloud Sync] Download error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Start integration with Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to 0.0.0.0 and Port 3000 as required by the platform environment
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Cloud Sync Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
