import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nom: String,
  prenom: String,
  role: { type: String, enum: ['admin', 'medecin'], default: 'medecin' }
});

export const User = mongoose.model('User', userSchema);