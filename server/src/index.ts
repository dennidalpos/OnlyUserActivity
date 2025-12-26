import express from "express"
import bodyParser from "body-parser"
import helmet from "helmet"
import { v4 as uuidv4 } from "uuid"
import path from "path"
import fs from "fs/promises"
import crypto from "crypto"
import rateLimit from "express-rate-limit"
import ldap from "ldapjs"
import { computeUserKey } from "../../shared/index"

const app = express()
app.use(helmet())
app.use(bodyParser.json({ limit: "1mb" }))

const PORT = Number(process.env.PORT || 3000)
const DATA_ROOT = process.env.DATA_ROOT || path.join(process.cwd(), "data")
const NODE_ENV = process.env.NODE_ENV || "development"

type TokenInfo = { token: string; expiresAt: string; upn: string; sid?: string; displayName?: string; userKey: string }
const tokenStore = new Map<string, TokenInfo>()

function errorResponse(code: string, message: string, details: Record<string, unknown> = {}) {
  return { code, message, details }
}

function parseUserIdentity(username: string): { upn: string } {
  const normalized = username.includes("@") ? username : `${username}@${process.env.LDAP_DOMAIN || "local"}`
  return { upn: normalized }
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

async function atomicWriteJson(filePath: string, data: unknown) {
  const tmpPath = `${filePath}.tmp`
  const payload = JSON.stringify(data, null, 2)
  await fs.writeFile(tmpPath, payload, "utf8")
  await fs.rename(tmpPath, filePath)
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const text = await fs.readFile(filePath, "utf8")
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

async function withUserLock<T>(userKey: string, action: () => Promise<T>): Promise<T> {
  const lockDir = path.join(DATA_ROOT, "users", userKey)
  await ensureDir(lockDir)
  const lockPath = path.join(lockDir, ".lock")
  const start = Date.now()
  const timeoutMs = 10000
  let attempt = 0
  while (true) {
    try {
      const payload = JSON.stringify({ pid: process.pid, timestamp: new Date().toISOString(), schemaVersion: 1 })
      await fs.writeFile(lockPath, payload, { flag: "wx" })
      break
    } catch {
      if (Date.now() - start > timeoutMs) {
        throw new Error("lock timeout")
      }
      const delay = Math.min(200 + attempt * 100, 1000)
      await new Promise(resolve => setTimeout(resolve, delay))
      attempt += 1
    }
  }
  try {
    return await action()
  } finally {
    await fs.rm(lockPath, { force: true })
  }
}

function hashPayload(payload: unknown): string {
  const text = JSON.stringify(payload)
  return crypto.createHash("sha256").update(text).digest("hex")
}

async function appendAudit(entry: Record<string, unknown>) {
  const auditDir = path.join(DATA_ROOT, "audit")
  await ensureDir(auditDir)
  const auditPath = path.join(auditDir, "audit.jsonl")
  const line = JSON.stringify({ schemaVersion: 1, ...entry }) + "\n"
  await fs.appendFile(auditPath, line, "utf8")
}

async function seedActivityTypes() {
  const typesDir = path.join(DATA_ROOT, "activity-types")
  await ensureDir(typesDir)
  const typesPath = path.join(typesDir, "activity-types.json")
  const versionsPath = path.join(typesDir, "versions.json")
  const existing = await readJson<{ schemaVersion: number; items: Array<{ id: string; label: string }> }>(typesPath, { schemaVersion: 1, items: [] })
  if (existing.items.length === 0) {
    const seed = {
      schemaVersion: 1,
      items: [
        { id: "work", label: "Lavoro" },
        { id: "meeting", label: "Riunione" },
        { id: "ferie", label: "Ferie" },
        { id: "malattia", label: "Malattia" },
        { id: "festivita", label: "Festività" },
        { id: "permesso", label: "Permesso" }
      ]
    }
    await atomicWriteJson(typesPath, seed)
    await atomicWriteJson(versionsPath, { schemaVersion: 1, version: uuidv4() })
  }
}

function requestIdMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const requestId = req.header("X-Request-Id") || uuidv4()
  res.setHeader("X-Request-Id", requestId)
  ;(req as any).requestId = requestId
  next()
}

app.use(requestIdMiddleware)

function tokenRateLimiter() {
  return rateLimit({
    windowMs: 60000,
    limit: 120,
    keyGenerator: req => ((req as any).user?.userKey as string) || req.ip
  })
}

app.use(tokenRateLimiter())

async function authenticateToken(token: string): Promise<TokenInfo | null> {
  const info = tokenStore.get(token)
  if (!info) return null
  if (new Date(info.expiresAt).getTime() < Date.now()) return null
  return info
}

function authMiddleware(required: boolean) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.header("Authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : ""
    if (!token) {
      if (required) {
        res.status(401).json(errorResponse("AUTH_REQUIRED", "Authentication required"))
        return
      }
      next()
      return
    }
    const info = await authenticateToken(token)
    if (!info) {
      res.status(401).json(errorResponse("AUTH_INVALID", "Invalid token"))
      return
    }
    ;(req as any).user = info
    next()
  }
}

async function ldapAuthenticate(username: string, password: string): Promise<{ upn: string; displayName?: string }> {
  const ldapUrl = process.env.LDAP_URL
  const baseDn = process.env.LDAP_BASE_DN
  if (!ldapUrl || !baseDn) {
    if (NODE_ENV !== "development") {
      throw new Error("LDAP not configured")
    }
    const allow = (process.env.DEV_ALLOWLIST || "user@local")
      .split(",")
      .map(item => item.trim().toLowerCase())
    if (!allow.includes(username.toLowerCase())) {
      throw new Error("Not allowed")
    }
    return { upn: username }
  }
  const client = ldap.createClient({ url: ldapUrl })
  const bindDn = username.includes("@") ? username : `${username}@${process.env.LDAP_DOMAIN || ""}`
  await new Promise<void>((resolve, reject) => {
    client.bind(bindDn, password, err => {
      if (err) reject(err)
      else resolve()
    })
  })
  const searchFilter = `(userPrincipalName=${bindDn})`
  const entry = await new Promise<{ displayName?: string }>((resolve, reject) => {
    client.search(baseDn, { filter: searchFilter, scope: "sub" }, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      let displayName: string | undefined
      res.on("searchEntry", e => {
        displayName = e.attributes.find(a => a.type === "displayName")?.values?.[0]
      })
      res.on("error", reject)
      res.on("end", () => resolve({ displayName }))
    })
  })
  client.unbind()
  return { upn: bindDn, displayName: entry.displayName }
}

async function ensureUserData(userKey: string) {
  const userDir = path.join(DATA_ROOT, "users", userKey)
  await ensureDir(userDir)
  await ensureDir(path.join(userDir, "months"))
  await ensureDir(path.join(userDir, "daily"))
  await ensureDir(path.join(userDir, "alerts"))
  const profilePath = path.join(userDir, "profile.json")
  const targetsPath = path.join(userDir, "targets.json")
  const profile = await readJson(profilePath, null as null | { schemaVersion: number; targetMinutes: number })
  if (!profile) {
    await atomicWriteJson(profilePath, { schemaVersion: 1, targetMinutes: 480 })
  }
  const targets = await readJson(targetsPath, null as null | { schemaVersion: number; overrides: Record<string, number> })
  if (!targets) {
    await atomicWriteJson(targetsPath, { schemaVersion: 1, overrides: {} })
  }
}

function parseTime(value: string): number {
  const [hh, mm] = value.split(":").map(Number)
  return hh * 60 + mm
}

function isQuarterHour(value: string): boolean {
  const parts = value.split(":")
  if (parts.length !== 2) return false
  const mm = Number(parts[1])
  return [0, 15, 30, 45].includes(mm)
}

function minutesBetween(start: string, end: string): number {
  return parseTime(end) - parseTime(start)
}

function sameDay(start: string, end: string): boolean {
  return parseTime(end) > parseTime(start)
}

function computeDaySummary(activities: any[], targetMinutes: number) {
  const totalMinutes = activities.reduce((sum, item) => sum + item.minutes, 0)
  const ordinaryMinutes = Math.min(totalMinutes, targetMinutes)
  const overtimeMinutes = Math.max(0, totalMinutes - targetMinutes)
  const progressPercent = targetMinutes === 0 ? 100 : Math.min(100, Math.round((ordinaryMinutes / targetMinutes) * 100))
  const status = totalMinutes >= targetMinutes ? "OK" : totalMinutes >= targetMinutes * 0.8 ? "WARN" : "ALERT"
  return { totalMinutes, ordinaryMinutes, overtimeMinutes, targetMinutes, progressPercent, status }
}

function shouldExempt(types: { id: string; label: string }[], activityTypeId: string): boolean {
  const special = ["Ferie", "Malattia", "Festività", "Permesso"]
  const type = types.find(item => item.id === activityTypeId)
  if (!type) return false
  return special.includes(type.label)
}

async function loadActivityTypes() {
  const typesPath = path.join(DATA_ROOT, "activity-types", "activity-types.json")
  return readJson<{ schemaVersion: number; items: Array<{ id: string; label: string }> }>(typesPath, { schemaVersion: 1, items: [] })
}

function makeDayKey(date: string) {
  return date
}

app.get("/api/v1/health", authMiddleware(false), async (req, res) => {
  const authStatus = (req as any).user ? "valid" : req.header("Authorization") ? "invalid" : undefined
  const payload: any = { status: "ok", time: new Date().toISOString() }
  if (authStatus) payload.authStatus = authStatus
  res.json(payload)
})

app.post("/api/v1/auth/login", async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    res.status(400).json(errorResponse("INVALID_REQUEST", "Username and password required"))
    return
  }
  try {
    const result = await ldapAuthenticate(username, password)
    const userKey = computeUserKey({ upn: result.upn })
    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString()
    const info: TokenInfo = { token, expiresAt, upn: result.upn, displayName: result.displayName, userKey }
    tokenStore.set(token, info)
    await ensureUserData(userKey)
    res.json({ token, expiresAt, user: { upn: result.upn, displayName: result.displayName }, userKey })
  } catch (err: any) {
    res.status(401).json(errorResponse("AUTH_FAILED", err.message || "Authentication failed"))
  }
})

app.post("/api/v1/activities", authMiddleware(true), async (req, res) => {
  const user = (req as any).user as TokenInfo
  const body = req.body || {}
  const { date, start, end, activityTypeId, activityLabel, notes, clientRequestId, idempotencyKey } = body
  if (!date || !start || !end || !activityTypeId) {
    res.status(400).json(errorResponse("INVALID_REQUEST", "Missing fields"))
    return
  }
  if (!isQuarterHour(start) || !isQuarterHour(end) || !sameDay(start, end)) {
    res.status(400).json(errorResponse("INVALID_TIME", "Invalid time range"))
    return
  }
  const minutes = minutesBetween(start, end)
  const monthKey = date.slice(0, 7)
  const userDir = path.join(DATA_ROOT, "users", user.userKey)
  await ensureUserData(user.userKey)
  await withUserLock(user.userKey, async () => {
    const monthPath = path.join(userDir, "months", `${monthKey}.json`)
    const monthData = await readJson<{ schemaVersion: number; activities: any[] }>(monthPath, { schemaVersion: 1, activities: [] })
    const dayActivities = monthData.activities.filter(item => item.date === date)
    const existing = monthData.activities.find(item => item.idempotencyKey && idempotencyKey && item.idempotencyKey === idempotencyKey)
    if (existing) {
      const summaryPath = path.join(userDir, "daily", `${date}.summary.json`)
      const summary = await readJson(summaryPath, { schemaVersion: 1, date, activities: dayActivities, totals: computeDaySummary(dayActivities, 480) })
      res.json({ activity: existing, summary })
      return
    }
    const overlap = dayActivities.some(item => !(item.end <= start || item.start >= end))
    if (overlap) {
      res.status(400).json(errorResponse("OVERLAP", "Activity overlaps"))
      return
    }
    const totalMinutes = dayActivities.reduce((sum, item) => sum + item.minutes, 0) + minutes
    if (totalMinutes > 960) {
      res.status(400).json(errorResponse("DAY_LIMIT", "Total minutes exceed limit"))
      return
    }
    const activity = {
      id: uuidv4(),
      date,
      start,
      end,
      minutes,
      activityTypeId,
      activityLabel: activityLabel || null,
      notes: notes || null,
      clientRequestId: clientRequestId || null,
      idempotencyKey: idempotencyKey || null,
      createdAt: new Date().toISOString()
    }
    monthData.activities.push(activity)
    await atomicWriteJson(monthPath, monthData)
    const profilePath = path.join(userDir, "profile.json")
    const profile = await readJson(profilePath, { schemaVersion: 1, targetMinutes: 480 })
    const types = await loadActivityTypes()
    const exempt = shouldExempt(types.items, activityTypeId)
    const targetMinutes = exempt ? 0 : profile.targetMinutes
    const updatedActivities = monthData.activities.filter(item => item.date === date)
    const totals = computeDaySummary(updatedActivities, targetMinutes)
    const summaryPath = path.join(userDir, "daily", `${date}.summary.json`)
    const summary = { schemaVersion: 1, date, activities: updatedActivities, totals }
    await atomicWriteJson(summaryPath, summary)
    const alertsPath = path.join(userDir, "alerts", "open.json")
    const historyPath = path.join(userDir, "alerts", "history.json")
    const openAlerts = totals.status === "ALERT" ? [{ date, status: totals.status }] : []
    await atomicWriteJson(alertsPath, { schemaVersion: 1, items: openAlerts })
    const history = await readJson(historyPath, { schemaVersion: 1, items: [] as any[] })
    history.items.push({ date, status: totals.status, recordedAt: new Date().toISOString() })
    await atomicWriteJson(historyPath, history)
    res.json({ activity, summary })
  })
  await appendAudit({
    requestId: (req as any).requestId,
    timestamp: new Date().toISOString(),
    userKey: user.userKey,
    route: "/api/v1/activities",
    method: "POST",
    status: res.statusCode,
    payloadHash: hashPayload(body)
  })
})

app.get("/api/v1/days/:date", authMiddleware(true), async (req, res) => {
  const user = (req as any).user as TokenInfo
  const date = req.params.date
  const userDir = path.join(DATA_ROOT, "users", user.userKey)
  const summaryPath = path.join(userDir, "daily", `${date}.summary.json`)
  const summary = await readJson(summaryPath, null)
  if (!summary) {
    res.status(404).json(errorResponse("NOT_FOUND", "Summary not found"))
    return
  }
  res.json(summary)
})

app.get("/api/v1/activity-types", authMiddleware(true), async (req, res) => {
  await seedActivityTypes()
  const versionsPath = path.join(DATA_ROOT, "activity-types", "versions.json")
  const typesPath = path.join(DATA_ROOT, "activity-types", "activity-types.json")
  const version = await readJson<{ schemaVersion: number; version: string }>(versionsPath, { schemaVersion: 1, version: "" })
  const etag = version.version
  if (req.header("If-None-Match") === etag) {
    res.status(304).end()
    return
  }
  const types = await readJson(typesPath, { schemaVersion: 1, items: [] })
  res.setHeader("ETag", etag)
  res.json(types)
})

app.put("/api/v1/activity-types", authMiddleware(true), async (req, res) => {
  const payload = req.body || {}
  if (!Array.isArray(payload.items)) {
    res.status(400).json(errorResponse("INVALID_REQUEST", "Items required"))
    return
  }
  const typesDir = path.join(DATA_ROOT, "activity-types")
  await ensureDir(typesDir)
  const typesPath = path.join(typesDir, "activity-types.json")
  const versionsPath = path.join(typesDir, "versions.json")
  await atomicWriteJson(typesPath, { schemaVersion: 1, items: payload.items })
  await atomicWriteJson(versionsPath, { schemaVersion: 1, version: uuidv4() })
  res.json({ status: "ok" })
  await appendAudit({
    requestId: (req as any).requestId,
    timestamp: new Date().toISOString(),
    userKey: (req as any).user.userKey,
    route: "/api/v1/activity-types",
    method: "PUT",
    status: res.statusCode,
    payloadHash: hashPayload(payload)
  })
})

app.get("/api/v1/dashboard/status", authMiddleware(true), async (req, res) => {
  const date = req.query.date as string
  const statusFilter = req.query.status as string | undefined
  const userKeyFilter = req.query.userKey as string | undefined
  const usersDir = path.join(DATA_ROOT, "users")
  await ensureDir(usersDir)
  const entries = await fs.readdir(usersDir)
  const results = [] as any[]
  for (const entry of entries) {
    if (userKeyFilter && entry !== userKeyFilter) continue
    const summaryPath = date ? path.join(usersDir, entry, "daily", `${date}.summary.json`) : null
    if (!summaryPath) continue
    const summary = await readJson(summaryPath, null)
    if (!summary) continue
    if (statusFilter && summary.totals?.status !== statusFilter) continue
    results.push({ userKey: entry, date, status: summary.totals?.status, progressPercent: summary.totals?.progressPercent })
  }
  const openAlertsCount = results.filter(item => item.status === "ALERT").length
  res.json({ items: results, openAlertsCount })
})

seedActivityTypes().then(() => {
  app.listen(PORT, () => {
    console.log(`server running on ${PORT}`)
  })
})
