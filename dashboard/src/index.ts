import express from "express"
import cookieParser from "cookie-parser"
import fetch from "node-fetch"
import ExcelJS from "exceljs"
import path from "path"

const app = express()
const PORT = Number(process.env.DASHBOARD_PORT || 4000)
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000"

app.set("view engine", "ejs")
app.set("views", path.join(process.cwd(), "src", "views"))

app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

function getToken(req: express.Request) {
  return req.cookies.token as string | undefined
}

function authRequired(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getToken(req)
  if (!token) {
    res.redirect("/login")
    return
  }
  next()
}

async function apiRequest(method: string, path: string, token: string, body?: any) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (res.status === 401) {
    throw new Error("unauthorized")
  }
  if (res.status === 204) return null
  return res.json()
}

app.get("/login", (req, res) => {
  res.render("login", { error: null })
})

app.post("/login", async (req, res) => {
  const { username, password } = req.body
  try {
    const response = await fetch(`${SERVER_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })
    if (!response.ok) {
      res.render("login", { error: "Login failed" })
      return
    }
    const data: any = await response.json()
    res.cookie("token", data.token, { httpOnly: true, sameSite: "lax" })
    res.redirect("/")
  } catch {
    res.render("login", { error: "Login failed" })
  }
})

app.get("/logout", (req, res) => {
  res.clearCookie("token")
  res.redirect("/login")
})

app.get("/", authRequired, async (req, res) => {
  const token = getToken(req) as string
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
  const status = req.query.status as string | undefined
  const userKey = req.query.userKey as string | undefined
  const params = new URLSearchParams({ date })
  if (status) params.set("status", status)
  if (userKey) params.set("userKey", userKey)
  try {
    const data: any = await apiRequest("GET", `/api/v1/dashboard/status?${params.toString()}`, token)
    res.render("status", { data, date, status, userKey })
  } catch {
    res.redirect("/login")
  }
})

app.get("/activity-types", authRequired, async (req, res) => {
  const token = getToken(req) as string
  try {
    const types: any = await apiRequest("GET", "/api/v1/activity-types", token)
    res.render("activity-types", { types, error: null })
  } catch {
    res.redirect("/login")
  }
})

app.post("/activity-types", authRequired, async (req, res) => {
  const token = getToken(req) as string
  const rawItems = (req.body.items as string) || ""
  const items = rawItems
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [id, label] = line.split(",")
      return { id: (id || "").trim(), label: (label || "").trim() }
    })
    .filter(item => item.id && item.label)
  try {
    await apiRequest("PUT", "/api/v1/activity-types", token, { items })
    res.redirect("/activity-types")
  } catch {
    res.render("activity-types", { types: { items }, error: "Update failed" })
  }
})

app.get("/export", authRequired, (req, res) => {
  res.render("export", { error: null })
})

app.post("/export", authRequired, async (req, res) => {
  const token = getToken(req) as string
  const mode = req.body.mode as string
  const date = (req.body.date as string) || new Date().toISOString().slice(0, 10)
  const data: any = await apiRequest("GET", `/api/v1/dashboard/status?date=${date}`, token)
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(mode === "month" ? "Month" : "Week")
  if (mode === "week") {
    sheet.addRow(["UserKey", "Date", "Status", "Progress"])
    for (const item of data.items) {
      sheet.addRow([item.userKey, item.date, item.status, item.progressPercent])
    }
  } else {
    sheet.addRow(["UserKey", "Date", "Status", "Progress"])
    for (const item of data.items) {
      sheet.addRow([item.userKey, item.date, item.status, item.progressPercent])
    }
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  res.setHeader("Content-Disposition", `attachment; filename=export-${mode}.xlsx`)
  await workbook.xlsx.write(res)
  res.end()
})

app.listen(PORT, () => {
  console.log(`dashboard running on ${PORT}`)
})
