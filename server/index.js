import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Site Management System Node.js API', time: new Date().toISOString() })
})

// Authentication Mock / Pass-through
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  if ((email === 'admin@site.com' && password === 'Admin@123') || password === 'Admin@123') {
    return res.json({
      success: true,
      data: {
        userId: 'user-admin-01',
        email: email || 'admin@site.com',
        role: 'ADMIN',
        accessToken: 'node-jwt-token-' + Date.now(),
        refreshToken: 'node-refresh-token-' + Date.now(),
        accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      },
    })
  }
  return res.status(401).json({ success: false, error: { message: 'E-posta veya şifre hatalı.' } })
})

app.listen(PORT, () => {
  console.log(`🚀 Node.js Express Site Management API running on http://localhost:${PORT}`)
})

