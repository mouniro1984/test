import express from 'express';
import MedicalRecord from '../models/MedicalRecord.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get all medical records for a patient
router.get('/:patientId', auth, async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.params.patientId })
      .sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new medical record
router.post('/:patientId', auth, async (req, res) => {
  try {
    const record = new MedicalRecord({
      patientId: req.params.patientId,
      date: req.body.date,
      diagnostic: req.body.diagnostic,
      prescription: req.body.prescription,
      notes: req.body.notes
    });
    const newRecord = await record.save();
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a medical record
router.put('/:id', auth, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Dossier médical non trouvé' });
    }

    if (req.body.date) record.date = req.body.date;
    if (req.body.diagnostic) record.diagnostic = req.body.diagnostic;
    if (req.body.prescription) record.prescription = req.body.prescription;
    if (req.body.notes !== undefined) record.notes = req.body.notes;

    const updatedRecord = await record.save();
    res.json(updatedRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a medical record
router.delete('/:id', auth, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Dossier médical non trouvé' });
    }
    await record.deleteOne();
    res.json({ message: 'Dossier médical supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;