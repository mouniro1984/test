import express from 'express';
import { Patient } from '../models/patient.js';
import { auth } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const patients = await Patient.find({ doctor: req.user.id });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des patients' });
  }
});

router.post('/', auth, async (req, res) => {
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

router.put('/:id', auth, async (req, res) => {
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

    // Remplacer complètement le document avec les nouvelles données
    await Patient.replaceOne(
      { _id: id },
      {
        ...req.body,
        _id: id,
        doctor: req.user.id
      }
    );

    // Récupérer et renvoyer le patient mis à jour
    const updatedPatient = await Patient.findById(id);
    res.json(updatedPatient);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Erreur lors de la modification du patient' });
  }
});

router.delete('/:id', auth, async (req, res) => {
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

export default router;