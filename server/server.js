import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'));
    }
  }
});

// Create uploads directory if it doesn't exist
(async () => {
  try {
    await fs.access('uploads');
  } catch {
    await fs.mkdir('uploads');
  }
})();

// Models
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nom: String,
  prenom: String,
  role: { type: String, enum: ['admin', 'medecin'], default: 'medecin' }
});

const User = mongoose.model('User', userSchema);

const patientSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  dateNaissance: { type: Date, required: true },
  telephone: { type: String, required: true },
  email: { type: String, required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Patient = mongoose.model('Patient', patientSchema);

const medicalRecordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  diagnostic: { type: String, required: true },
  prescription: { type: String, required: true },
  notes: String,
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  date: { type: Date, required: true },
  heure: { type: String, required: true },
  motif: { type: String, required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error();
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Veuillez vous authentifier.' });
  }
};

const adminAuth = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès non autorisé' });
  }
  next();
};

// Routes
// Auth
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ email });
    
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
});

// Users
app.get('/api/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
});

app.post('/api/users', auth, adminAuth, async (req, res) => {
  try {
    const { email, password, nom, prenom, role } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const user = new User({
      email,
      password,
      nom,
      prenom,
      role: role || 'medecin'
    });

    await user.save();
    const userResponse = { ...user.toObject() };
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la création de l\'utilisateur' });
  }
});

app.put('/api/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, nom, prenom, role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Check if email is being changed and if it's already in use
    if (email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: id } });
      if (emailExists) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
    }

    // Only update password if a new one is provided
    const updateData = {
      email,
      nom,
      prenom,
      role
    };

    if (password) {
      updateData.password = password;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    const userResponse = { ...updatedUser.toObject() };
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Erreur lors de la modification de l\'utilisateur' });
  }
});

app.delete('/api/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Impossible de supprimer le dernier administrateur' });
      }
    }

    await User.findByIdAndDelete(id);
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

// Profile
app.put('/api/users/profile', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, nom, prenom, email } = req.body;
    const user = await User.findById(req.user.id);

    if (currentPassword && newPassword) {
      if (user.password !== currentPassword) {
        return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
      }
      user.password = newPassword;
    }

    user.nom = nom || user.nom;
    user.prenom = prenom || user.prenom;
    user.email = email || user.email;

    await user.save();
    
    const userResponse = { ...user.toObject() };
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour du profil' });
  }
});

// Patients
app.get('/api/patients', auth, async (req, res) => {
  try {
    const patients = await Patient.find({ doctor: req.user.id });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des patients' });
  }
});

app.post('/api/patients', auth, async (req, res) => {
  try {
    const patient = new Patient({
      ...req.body,
      doctor: req.user.id
    });
    await patient.save();
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la création du patient' });
  }
});

app.put('/api/patients/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de patient invalide' });
    }

    const patient = await Patient.findOne({ 
      _id: id,
      doctor: req.user.id 
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      { $set: req.body },
      { 
        new: true,
        runValidators: true
      }
    );

    res.json(updatedPatient);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Erreur lors de la modification du patient' });
  }
});

app.delete('/api/patients/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de patient invalide' });
    }

    const patient = await Patient.findOne({ 
      _id: id,
      doctor: req.user.id 
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    await Patient.deleteOne({ _id: id });
    res.json({ message: 'Patient supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du patient' });
  }
});

// Medical Records
app.get('/api/medical-records/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: 'ID de patient invalide' });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      doctor: req.user.id
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    const records = await MedicalRecord.find({
      patientId,
      doctor: req.user.id
    }).sort({ date: -1 });

    res.json(records);
  } catch (error) {
    console.error('Fetch records error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des dossiers médicaux' });
  }
});

app.post('/api/medical-records/:patientId', auth, upload.array('attachments'), async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: 'ID de patient invalide' });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      doctor: req.user.id
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadDate: new Date()
    })) : [];

    const record = new MedicalRecord({
      ...req.body,
      patientId,
      doctor: req.user.id,
      attachments
    });

    await record.save();
    res.status(201).json(record);
  } catch (error) {
    console.error('Create record error:', error);
    res.status(400).json({ message: 'Erreur lors de la création du dossier médical' });
  }
});

app.put('/api/medical-records/:id', auth, upload.array('attachments'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de dossier médical invalide' });
    }

    const record = await MedicalRecord.findOne({
      _id: id,
      doctor: req.user.id
    });

    if (!record) {
      return res.status(404).json({ message: 'Dossier médical non trouvé' });
    }

    const newAttachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadDate: new Date()
    })) : [];

    const updatedRecord = await MedicalRecord.findByIdAndUpdate(
      id,
      {
        ...req.body,
        attachments: [...(record.attachments || []), ...newAttachments]
      },
      { new: true }
    );

    res.json(updatedRecord);
  } catch (error) {
    console.error('Update record error:', error);
    res.status(500).json({ message: 'Erreur lors de la modification du dossier médical' });
  }
});

app.delete('/api/medical-records/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de dossier médical invalide' });
    }

    const record = await MedicalRecord.findOne({
      _id: id,
      doctor: req.user.id
    });

    if (!record) {
      return res.status(404).json({ message: 'Dossier médical non trouvé' });
    }

    if (record.attachments && record.attachments.length > 0) {
      for (const attachment of record.attachments) {
        try {
          await fs.unlink(path.join('uploads', attachment.filename));
        } catch (error) {
          console.error('Erreur lors de la suppression du fichier:', error);
        }
      }
    }

    await MedicalRecord.deleteOne({ _id: id });
    res.json({ message: 'Dossier médical supprimé avec succès' });
  } catch (error) {
    console.error('Delete record error:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du dossier médical' });
  }
});

app.get('/api/medical-records/attachment/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('uploads', filename);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    res.download(filePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Erreur lors du téléchargement du fichier' });
  }
});

// Appointments
app.get('/api/appointments', auth, async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctor: req.user.id })
      .populate('patient')
      .sort({ date: 1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des rendez-vous' });
  }
});

app.post('/api/appointments', auth, async (req, res) => {
  try {
    const appointment = new Appointment({
      ...req.body,
      doctor: req.user.id
    });
    await appointment.save();
    const populatedAppointment = await appointment.populate('patient');
    res.status(201).json(populatedAppointment);
  } catch (error) {
    console.error('Appointment creation error:', error);
    res.status(400).json({ message: 'Erreur lors de la création du rendez-vous' });
  }
});

// Initial Setup
const createInitialAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      await User.create({
        email: 'admin@example.com',
        password: '1234',
        nom: 'Admin',
        prenom: 'User',
        role: 'admin'
      });
      console.log('Initial admin user created');
    }
  } catch (error) {
    console.error('Error creating initial admin:', error);
  }
};

createInitialAdmin();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});