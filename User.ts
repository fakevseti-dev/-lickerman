import { Schema, model, models, Document } from 'mongoose';

export interface IUser extends Document {
  telegramId:       string;
  username:         string;
  balance:          number;
  totalEarned:      number;
  totalSpent:       number;
  energy:           number;
  damageLevel:      number;
  capacityLevel:    number;
  recoveryLevel:    number;
  referrals:        number;
  invitedBy:        string | null;
  earnedForInviter: number;
  rank:             number;
  isBanned:         boolean;
  sessionId:        string | null;
  completedTasks:   string[];
  lastSync:         Date;
  createdAt:        Date;
}

// Точная копия схемы из оригинального server.js
const S = new Schema<IUser>({
  telegramId:       { type: String, unique: true, required: true },
  username:         { type: String, default: 'Гравець' },
  balance:          { type: Number, default: 0 },
  totalEarned:      { type: Number, default: 0 },
  totalSpent:       { type: Number, default: 0 },
  energy:           { type: Number, default: 1000 },
  damageLevel:      { type: Number, default: 1 },
  capacityLevel:    { type: Number, default: 1 },
  recoveryLevel:    { type: Number, default: 1 },
  referrals:        { type: Number, default: 0 },
  invitedBy:        { type: String, default: null },
  earnedForInviter: { type: Number, default: 0 },
  rank:             { type: Number, default: 1 },
  isBanned:         { type: Boolean, default: false },
  sessionId:        { type: String, default: null },
  completedTasks:   { type: [String], default: [] },
  lastSync:         { type: Date, default: Date.now },
  createdAt:        { type: Date, default: Date.now },
}, { versionKey: false });

S.index({ invitedBy: 1 });
S.index({ isBanned: 1 });
S.index({ lastSync: -1 });

export const User =
  (models.User as typeof import('mongoose').Model<IUser>) ??
  model<IUser>('User', S);
