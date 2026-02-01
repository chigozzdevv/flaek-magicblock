import { userRepository } from '@/features/auth/user.repository'
import { tenantRepository } from '@/features/tenants/tenant.repository'
import { hashPassword, verifyPassword } from '@/utils/password'
import { httpError } from '@/shared/errors'
import { signJwt } from '@/utils/jwt'
import { Roles } from '@/shared/roles'
import crypto from 'crypto'

type SignupInput = { name: string; email: string; password: string; orgName: string }
type LoginInput = { email: string; password: string }
type MeInput = { userId: string }
type ChangePasswordInput = { userId: string; oldPassword: string; newPassword: string }
type ResetPasswordRequestInput = { email: string }
type ResetPasswordConfirmInput = { token: string; password: string }

async function signup(input: SignupInput) {
  const existing = await userRepository.findByEmail(input.email)
  if (existing) throw httpError(409, 'conflict', 'email_already_exists')
  const passwordHash = await hashPassword(input.password)
  const user = await userRepository.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: Roles.USER,
  } as any)
  const tenant = await tenantRepository.ensureForOwner(user.id, input.orgName.trim())
  return { user_id: user.id, tenant_id: tenant.id }
}

async function login(input: LoginInput) {
  const user = await userRepository.findByEmail(input.email.toLowerCase())
  if (!user) throw httpError(401, 'unauthorized', 'invalid_credentials')
  const ok = await verifyPassword(input.password, user.passwordHash)
  if (!ok) throw httpError(401, 'unauthorized', 'invalid_credentials')
  const jwt = signJwt({ sub: user.id, role: user.role })
  return { jwt }
}

async function me(input: MeInput) {
  const user = await userRepository.findById(input.userId)
  if (!user) throw httpError(404, 'not_found', 'user_not_found')
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  }
}

async function changePassword(input: ChangePasswordInput) {
  const user = await userRepository.findById(input.userId)
  if (!user) throw httpError(404, 'not_found', 'user_not_found')
  const ok = await verifyPassword(input.oldPassword, user.passwordHash)
  if (!ok) throw httpError(400, 'invalid_body', 'old_password_incorrect')
  const hash = await hashPassword(input.newPassword)
  await userRepository.updatePassword(user.id, hash)
}

async function resetPasswordRequest(input: ResetPasswordRequestInput) {
  const user = await userRepository.findByEmail(input.email.toLowerCase())
  if (!user) return
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60)
  await userRepository.setResetPassword(user.id, token, expiresAt)
}

async function resetPasswordConfirm(input: ResetPasswordConfirmInput) {
  const user = await userRepository.findByValidResetToken(input.token)
  if (!user) throw httpError(400, 'invalid_token', 'invalid_or_expired_token')
  const hash = await hashPassword(input.password)
  await userRepository.updatePassword(user.id, hash)
  await userRepository.clearResetPassword(user.id)
}

export const authService = {
  signup,
  login,
  me,
  changePassword,
  resetPasswordRequest,
  resetPasswordConfirm,
}
