// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DATA_DIR = path.resolve(__dirname, "data");
var DB_FILE = path.join(DATA_DIR, "morya_database.json");
function getInitialDbState() {
  return {
    version: 1,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    customers: [],
    mealLogs: [],
    expenses: [],
    workers: [],
    cleanings: [],
    trials: [],
    rules: null,
    walkinMealTypes: [],
    walkinTokens: [],
    weeklyMenu: [],
    polls: [],
    reminders: [],
    mealRatings: [],
    complaints: [],
    supportTickets: [],
    inventoryItems: [],
    inventoryMovements: [],
    inventorySuppliers: [],
    notifications: [],
    credentials: {},
    deletedCustomerIds: []
  };
}
var dbMemory = getInitialDbState();
function loadDbFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      dbMemory = { ...getInitialDbState(), ...parsed };
      console.log(`[DB] Loaded ${dbMemory.customers.length} customers and ${dbMemory.mealLogs.length} meal logs from disk.`);
    }
    if (dbMemory.customers.length === 0) {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const endDate = new Date(Date.now() + 30 * 864e5).toISOString().split("T")[0];
      dbMemory.customers = [
        {
          id: "MM-2026-003",
          name: "Manmath Bhankhedkar",
          phone: "7447527804",
          gender: "male",
          hostelOrAddress: "Kurunda Complex",
          collegeOrWork: "Engineering College",
          planType: "monthly_2meals",
          totalAmount: 3e3,
          paidAmount: 3e3,
          balance: 0,
          startDate: today,
          endDate,
          status: "active",
          qrToken: "MM-2026-003-TOKEN",
          renewals: [],
          payments: [
            {
              id: "pay-init-01",
              amount: 3e3,
              date: today,
              mode: "upi",
              notes: "Monthly Membership Paid via UPI",
              recordedBy: "Owner"
            }
          ],
          leaves: [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      ];
      dbMemory.rules = {
        messName: "Morya Mess",
        messSubtitle: "Digital Operations & Tiffin Service Management",
        ganpatiImage: "",
        ownerName: "Bhai & Management",
        contactPhone: "+91 74475 27804",
        address: "Near Girls Hostel Complex, College Road",
        currency: "\u20B9",
        upiId: "moryamess@upi",
        upiPayeeName: "Morya Mess Pune",
        upiQrCodeImage: "",
        messStatus: "open",
        messClosureReason: "",
        durationMethod: "calendar",
        defaultDurationDays: 30,
        allowAdvanceRenewal: true,
        defaultMonthlyFee: 2500,
        lostCardPenalty: 60,
        allowDuplicateMeal: false,
        duplicateOverrideAllowed: true,
        leaveExtendsSubscription: true,
        maxLeaveDaysPerMonth: 7,
        expiringSoonAlertDays: 3,
        shortTermThresholdDays: 3,
        requirePaymentBeforeMeal: false,
        mealTypes: [
          { type: "lunch", name: "Lunch Shift", startTime: "10:30", endTime: "14:30", enabled: true },
          { type: "dinner", name: "Dinner Shift", startTime: "19:30", endTime: "21:45", enabled: true }
        ]
      };
      saveDbToDisk();
      console.log("[DB] Seeded active member and default mess configuration.");
    }
  } catch (err) {
    console.error("[DB] Error loading database from disk:", err);
  }
}
function saveDbToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    dbMemory.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(dbMemory, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Error saving database to disk:", err);
  }
}
async function startServer() {
  loadDbFromDisk();
  const app = express();
  const PORT = 3e3;
  const HOST = "0.0.0.0";
  app.set("etag", false);
  app.use(express.json({ limit: "20mb" }));
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (_req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.get(["/health", "/healthz", "/api/health", "/_health", "/ping", "/livez", "/readyz"], (_req, res) => {
    res.status(200).json({
      status: "ok",
      app: "Morya Mess Full-Stack Engine",
      uptime: process.uptime(),
      customersCount: dbMemory.customers.length,
      mealLogsCount: dbMemory.mealLogs.length,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/sync", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.json({
      success: true,
      timestamp: dbMemory.lastUpdated,
      data: dbMemory
    });
  });
  app.post("/api/sync", (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ success: false, error: "Invalid payload" });
      }
      let hasChanges = false;
      if (Array.isArray(payload.customers)) {
        const deletedSet = /* @__PURE__ */ new Set([...dbMemory.deletedCustomerIds || [], ...payload.deletedCustomerIds || []]);
        const map = /* @__PURE__ */ new Map();
        dbMemory.customers.forEach((c) => {
          if (c && c.id && !deletedSet.has(c.id)) map.set(c.id, c);
        });
        payload.customers.forEach((c) => {
          if (c && c.id && !deletedSet.has(c.id)) {
            const existing = map.get(c.id);
            if (existing) {
              const mergedLeavesMap = /* @__PURE__ */ new Map();
              (existing.leaves || []).forEach((l) => mergedLeavesMap.set(l.id, l));
              (c.leaves || []).forEach((l) => mergedLeavesMap.set(l.id, l));
              const mergedPaymentsMap = /* @__PURE__ */ new Map();
              (existing.payments || []).forEach((p) => mergedPaymentsMap.set(p.id, p));
              (c.payments || []).forEach((p) => mergedPaymentsMap.set(p.id, p));
              map.set(c.id, {
                ...existing,
                ...c,
                leaves: Array.from(mergedLeavesMap.values()),
                payments: Array.from(mergedPaymentsMap.values())
              });
            } else {
              map.set(c.id, c);
            }
          }
        });
        dbMemory.customers = Array.from(map.values());
        if (payload.deletedCustomerIds && Array.isArray(payload.deletedCustomerIds)) {
          dbMemory.deletedCustomerIds = Array.from(/* @__PURE__ */ new Set([...dbMemory.deletedCustomerIds, ...payload.deletedCustomerIds]));
        }
        hasChanges = true;
      }
      if (Array.isArray(payload.mealLogs)) {
        const map = /* @__PURE__ */ new Map();
        dbMemory.mealLogs.forEach((l) => {
          if (l && l.id) map.set(l.id, l);
        });
        payload.mealLogs.forEach((l) => {
          if (l && l.id) map.set(l.id, l);
        });
        dbMemory.mealLogs = Array.from(map.values()).sort(
          (a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime()
        );
        hasChanges = true;
      }
      if (Array.isArray(payload.expenses)) {
        const map = /* @__PURE__ */ new Map();
        dbMemory.expenses.forEach((e) => {
          if (e && e.id) map.set(e.id, e);
        });
        payload.expenses.forEach((e) => {
          if (e && e.id) map.set(e.id, e);
        });
        dbMemory.expenses = Array.from(map.values());
        hasChanges = true;
      }
      if (payload.rules && typeof payload.rules === "object") {
        dbMemory.rules = { ...dbMemory.rules || {}, ...payload.rules };
        hasChanges = true;
      }
      if (Array.isArray(payload.workers)) {
        dbMemory.workers = payload.workers;
        hasChanges = true;
      }
      if (Array.isArray(payload.cleanings)) {
        dbMemory.cleanings = payload.cleanings;
        hasChanges = true;
      }
      if (Array.isArray(payload.trials)) {
        const map = /* @__PURE__ */ new Map();
        dbMemory.trials.forEach((t) => {
          if (t && t.id) map.set(t.id, t);
        });
        payload.trials.forEach((t) => {
          if (t && t.id) map.set(t.id, t);
        });
        dbMemory.trials = Array.from(map.values()).sort(
          (a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
        );
        hasChanges = true;
      }
      if (Array.isArray(payload.walkinMealTypes)) {
        dbMemory.walkinMealTypes = payload.walkinMealTypes;
        hasChanges = true;
      }
      if (Array.isArray(payload.walkinTokens)) {
        dbMemory.walkinTokens = payload.walkinTokens;
        hasChanges = true;
      }
      if (Array.isArray(payload.weeklyMenu)) {
        dbMemory.weeklyMenu = payload.weeklyMenu;
        hasChanges = true;
      }
      if (Array.isArray(payload.polls)) {
        dbMemory.polls = payload.polls;
        hasChanges = true;
      }
      if (Array.isArray(payload.reminders)) {
        dbMemory.reminders = payload.reminders;
        hasChanges = true;
      }
      if (Array.isArray(payload.mealRatings)) {
        const map = /* @__PURE__ */ new Map();
        dbMemory.mealRatings.forEach((r) => map.set(r.id, r));
        payload.mealRatings.forEach((r) => map.set(r.id, r));
        dbMemory.mealRatings = Array.from(map.values());
        hasChanges = true;
      }
      if (Array.isArray(payload.complaints)) {
        const map = /* @__PURE__ */ new Map();
        dbMemory.complaints.forEach((c) => map.set(c.id, c));
        payload.complaints.forEach((c) => map.set(c.id, c));
        dbMemory.complaints = Array.from(map.values());
        hasChanges = true;
      }
      if (Array.isArray(payload.inventoryItems)) {
        dbMemory.inventoryItems = payload.inventoryItems;
        hasChanges = true;
      }
      if (Array.isArray(payload.inventoryMovements)) {
        dbMemory.inventoryMovements = payload.inventoryMovements;
        hasChanges = true;
      }
      if (Array.isArray(payload.notifications)) {
        const map = /* @__PURE__ */ new Map();
        dbMemory.notifications.forEach((n) => map.set(n.id, n));
        payload.notifications.forEach((n) => map.set(n.id, n));
        dbMemory.notifications = Array.from(map.values());
        hasChanges = true;
      }
      if (payload.credentials && typeof payload.credentials === "object") {
        dbMemory.credentials = { ...dbMemory.credentials || {}, ...payload.credentials };
        hasChanges = true;
      }
      if (hasChanges) {
        saveDbToDisk();
      }
      return res.json({
        success: true,
        timestamp: dbMemory.lastUpdated,
        data: dbMemory
      });
    } catch (err) {
      console.error("[API /api/sync error]:", err);
      return res.status(500).json({ success: false, error: err?.message || "Sync failed" });
    }
  });
  app.post("/api/sync/attendance", (req, res) => {
    try {
      const { customerId, customerName, mealType, scanStatus, reason, overrideNotes } = req.body;
      if (!customerId || !mealType) {
        return res.status(400).json({ success: false, error: "Missing customerId or mealType" });
      }
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const newLog = {
        id: `ml-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        customerId,
        customerName: customerName || "Student Member",
        mealType,
        date: todayStr,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        scanStatus: scanStatus || "ALLOW",
        reason: reason || "Attendance Confirmed",
        overrideNotes
      };
      dbMemory.mealLogs.unshift(newLog);
      saveDbToDisk();
      return res.json({ success: true, log: newLog, allLogs: dbMemory.mealLogs });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });
  app.post("/api/sync/leaves", (req, res) => {
    try {
      const { action, customerId, leaveId, startDate, endDate, days, reason, approvedBy } = req.body;
      const customerIndex = dbMemory.customers.findIndex((c) => c.id === customerId);
      if (customerIndex === -1) {
        return res.status(404).json({ success: false, error: "Customer not found" });
      }
      const cust = dbMemory.customers[customerIndex];
      const leaves = cust.leaves || [];
      if (action === "request") {
        const sDate = /* @__PURE__ */ new Date(startDate + "T00:00:00");
        const eDate = /* @__PURE__ */ new Date(endDate + "T00:00:00");
        if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || sDate > eDate) {
          return res.status(400).json({ success: false, error: "Invalid start or end date" });
        }
        const touchedMonths = /* @__PURE__ */ new Set();
        const curDate = new Date(sDate);
        while (curDate <= eDate) {
          touchedMonths.add(curDate.toISOString().split("T")[0].substring(0, 7));
          curDate.setDate(curDate.getDate() + 1);
        }
        for (const mStr of touchedMonths) {
          let usedDays = 0;
          const seenRanges = /* @__PURE__ */ new Set();
          for (const l of leaves) {
            if (l.status === "rejected") continue;
            if (!l.startDate || !l.endDate) continue;
            const rKey = `${l.startDate}_${l.endDate}`;
            if (seenRanges.has(rKey)) continue;
            seenRanges.add(rKey);
            const ls = /* @__PURE__ */ new Date(l.startDate + "T00:00:00");
            const le = /* @__PURE__ */ new Date(l.endDate + "T00:00:00");
            if (isNaN(ls.getTime()) || isNaN(le.getTime()) || ls > le) continue;
            const c = new Date(ls);
            while (c <= le) {
              if (c.toISOString().split("T")[0].substring(0, 7) === mStr) usedDays++;
              c.setDate(c.getDate() + 1);
            }
          }
          let reqDays = 0;
          const c2 = new Date(sDate);
          while (c2 <= eDate) {
            if (c2.toISOString().split("T")[0].substring(0, 7) === mStr) reqDays++;
            c2.setDate(c2.getDate() + 1);
          }
          if (usedDays >= 5) {
            return res.status(400).json({
              success: false,
              error: `\u26A0\uFE0F Monthly leave limit reached for ${mStr}. Maximum 5 days allowed per month.`
            });
          }
          if (usedDays + reqDays > 5) {
            const rem = Math.max(0, 5 - usedDays);
            return res.status(400).json({
              success: false,
              error: `\u26A0\uFE0F Monthly leave limit exceeded for ${mStr}. Used: ${usedDays} days, Remaining: ${rem} days (Max 5 days per month allowed).`
            });
          }
        }
        const newLeave = {
          id: leaveId || `lv-${Date.now()}`,
          startDate,
          endDate,
          days: Number(days) || 1,
          reason: reason || "Personal Leave",
          approved: false,
          status: "pending",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          requestedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        const alreadyExists = leaves.some(
          (l) => l.id === newLeave.id || l.startDate === startDate && l.endDate === endDate && l.status !== "rejected"
        );
        if (!alreadyExists) {
          cust.leaves = [newLeave, ...leaves];
        }
        const notifExists = (dbMemory.notifications || []).some(
          (n) => n.relatedRecordId && (n.relatedRecordId === newLeave.id || n.relatedRecordId === leaveId) || n.type === "leave_request" && n.customerId === cust.id && n.message.includes(startDate) && n.message.includes(endDate)
        );
        if (!notifExists) {
          const notif = {
            id: `notif-${Date.now()}`,
            type: "leave_request",
            title: "New Student Leave Request",
            message: `${cust.name} requested leave from ${startDate} to ${endDate} (${newLeave.days} days). Reason: ${reason}`,
            customerId: cust.id,
            customerName: cust.name,
            relatedRecordId: newLeave.id,
            priority: "high",
            isRead: false,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          dbMemory.notifications = [notif, ...dbMemory.notifications || []];
        }
        saveDbToDisk();
        return res.json({ success: true, customer: cust, leave: newLeave });
      }
      if (action === "approve" || action === "reject") {
        const isApprove = action === "approve";
        cust.leaves = leaves.map((l) => {
          if (l.id === leaveId) {
            return {
              ...l,
              approved: isApprove,
              status: isApprove ? "approved" : "rejected",
              approvedBy: approvedBy || "Mess Management",
              resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
          return l;
        });
        if (isApprove) {
          const targetLeave = leaves.find((l) => l.id === leaveId);
          const leaveDays = targetLeave ? Number(targetLeave.days) || 1 : 1;
          if (cust.endDate) {
            const curEnd = new Date(cust.endDate);
            curEnd.setDate(curEnd.getDate() + leaveDays);
            cust.endDate = curEnd.toISOString().split("T")[0];
          }
        }
        saveDbToDisk();
        return res.json({ success: true, customer: cust });
      }
      return res.status(400).json({ success: false, error: "Invalid leave action" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });
  app.post("/api/sync/complaints", (req, res) => {
    try {
      const { complaint } = req.body;
      if (!complaint || !complaint.id) {
        return res.status(400).json({ success: false, error: "Invalid complaint object" });
      }
      const map = /* @__PURE__ */ new Map();
      (dbMemory.complaints || []).forEach((c) => map.set(c.id, c));
      map.set(complaint.id, complaint);
      dbMemory.complaints = Array.from(map.values());
      saveDbToDisk();
      return res.json({ success: true, complaints: dbMemory.complaints });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });
  app.post("/api/sync/ratings", (req, res) => {
    try {
      const { rating } = req.body;
      if (!rating || !rating.id) {
        return res.status(400).json({ success: false, error: "Invalid rating object" });
      }
      const map = /* @__PURE__ */ new Map();
      (dbMemory.mealRatings || []).forEach((r) => map.set(r.id, r));
      map.set(rating.id, rating);
      dbMemory.mealRatings = Array.from(map.values());
      saveDbToDisk();
      return res.json({ success: true, ratings: dbMemory.mealRatings });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });
  app.post("/api/sync/credentials", (req, res) => {
    try {
      const { key, credential } = req.body;
      if (!key || !credential) {
        return res.status(400).json({ success: false, error: "Missing key or credential" });
      }
      dbMemory.credentials = {
        ...dbMemory.credentials || {},
        [key]: credential
      };
      saveDbToDisk();
      return res.json({ success: true, credentials: dbMemory.credentials });
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });
  const distPath = path.resolve(__dirname, "dist");
  const indexPath = path.join(distPath, "index.html");
  const isProduction = fs.existsSync(indexPath) && process.env.NODE_ENV !== "development";
  if (isProduction) {
    app.use("/assets", express.static(path.join(distPath, "assets"), {
      maxAge: "1y",
      immutable: true
    }));
    app.get("/assets/:filename", (req, res) => {
      const requestedFile = req.params.filename;
      const exactPath = path.join(distPath, "assets", requestedFile);
      if (fs.existsSync(exactPath)) {
        return res.sendFile(exactPath);
      }
      const assetsDir = path.join(distPath, "assets");
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        if (requestedFile.endsWith(".js")) {
          const currentJs = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
          if (currentJs) {
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
            return res.sendFile(path.join(assetsDir, currentJs));
          }
        }
        if (requestedFile.endsWith(".css")) {
          const currentCss = files.find((f) => f.startsWith("index-") && f.endsWith(".css"));
          if (currentCss) {
            res.setHeader("Content-Type", "text/css; charset=utf-8");
            return res.sendFile(path.join(assetsDir, currentCss));
          }
        }
      }
      return res.status(404).send("Asset not found");
    });
    app.use(express.static(distPath, {
      maxAge: 0,
      setHeaders: (response, filePath) => {
        if (filePath.endsWith(".html") || filePath.endsWith(".json")) {
          response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      }
    }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/health")) return next();
      if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
        return res.status(404).send("File not found");
      }
      if (fs.existsSync(indexPath)) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        return res.sendFile(indexPath);
      }
      return res.status(404).send("Application bundle not found. Please build or run dev.");
    });
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.use((err, req, res, next) => {
    console.error("[Morya Mess Server Error]:", err);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  });
  const server = app.listen(PORT, HOST, () => {
    console.log(`[Morya Mess Server] Running on http://${HOST}:${PORT}`);
  });
  server.on("error", (err) => {
    console.error("[Morya Mess Server Listen Error]:", err);
  });
  process.on("SIGTERM", () => {
    console.log("[Morya Mess Server] Received SIGTERM, gracefully closing server...");
    server.close(() => {
      console.log("[Morya Mess Server] Closed connections successfully.");
      process.exit(0);
    });
  });
  process.on("SIGINT", () => {
    server.close(() => {
      process.exit(0);
    });
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
