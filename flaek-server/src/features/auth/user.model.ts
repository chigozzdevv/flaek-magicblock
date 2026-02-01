import mongoose, { Schema } from 'mongoose'
import { Role, Roles } from '@/shared/roles'

export type UserDocument = mongoose.Document & {
  name: string
  email: string
  passwordHash: string
  role: Role
  resetPasswordToken?: string
  resetPasswordExpires?: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(Roles), default: Roles.USER },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true },
)

export const UserModel = mongoose.models.User || mongoose.model<UserDocument>('User', userSchema)
