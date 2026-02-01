import { Server } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { verifyJwt } from '@/utils/jwt'
import { env } from '@/config/env'
import { tenantRepository } from '@/features/tenants/tenant.repository'
import { userRepository } from '@/features/auth/user.repository'

let io: Server | null = null

export function initializeSocket(httpServer: HTTPServer) {
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const allowedOriginPatterns = [/^https:\/\/.*\.vercel\.app$/]

  function isAllowedOrigin(origin?: string | null) {
    if (!origin) return true
    if (allowedOrigins.includes(origin)) return true
    return allowedOriginPatterns.some((re) => re.test(origin))
  }

  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) return callback(null, true)
        return callback(new Error('Not allowed by CORS'))
      },
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Authorization', 'Content-Type'],
    },
  })

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error('Authentication error'))
    }

    try {
      const tenantByApiKey = await tenantRepository.findByApiKey(token)
      if (tenantByApiKey) {
        ;(socket as any).tenantId = tenantByApiKey.id
        return next()
      }

      const payload = verifyJwt<{ sub: string }>(token)
      const user = await userRepository.findById(payload.sub)
      if (!user) return next(new Error('Invalid token'))
      const tenant = await tenantRepository.findByOwnerUserId(user.id)
      if (!tenant) return next(new Error('Tenant not found'))
      ;(socket as any).tenantId = tenant.id
      return next()
    } catch (error) {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const tenantId = (socket as any).tenantId
    console.log(`Client connected: ${socket.id} (tenant: ${tenantId})`)

    socket.join(`tenant:${tenantId}`)

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
    })
  })

  return io
}

export function broadcastJobUpdate(tenantId: string, jobUpdate: any) {
  if (!io) return

  io.to(`tenant:${tenantId}`).emit('job:update', jobUpdate)
}

export function getSocketIO() {
  return io
}
