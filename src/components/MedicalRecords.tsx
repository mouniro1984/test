import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Edit, Trash2, Paperclip, Download } from 'lucide-react';

interface MedicalRecord {
  _id: string;
  patientId: string;
  date: string;
  diagnostic: string;
  prescription: string;
  notes: string;
  attachments: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    uploadDate: string;
  }>;
}

interface Patient {
  _id: string;
  nom: string;
  prenom: string;
}

interface Props {
  patientId: string;
  onClose: () => void;
  patient: Patient | undefined;
}

const MedicalRecords: React.FC<Props> = ({ patientId, onClose, patient }) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    diagnostic: '',
    prescription: '',
    notes: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://medical-back-react.onrender.com/api/medical-records/${patientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRecords(response.data);
      setError(null);
    } catch (error) {
      console.error('Erreur lors de la récupération des dossiers médicaux:', error);
      setError('Erreur lors de la récupération des dossiers médicaux');
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [patientId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setError('Certains fichiers ont été ignorés car ils ne respectent pas les critères (type ou taille)');
    }

    setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();

      // Append text fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      // Append files
      selectedFiles.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent: any) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      };

      if (editingRecord) {
        await axios.put(
          `https://medical-back-react.onrender.com/api/medical-records/${editingRecord._id}`,
          formDataToSend,
          config
        );
      } else {
        await axios.post(
          `https://medical-back-react.onrender.com/api/medical-records/${patientId}`,
          formDataToSend,
          config
        );
      }

      fetchRecords();
      setShowForm(false);
      setEditingRecord(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        diagnostic: '',
        prescription: '',
        notes: ''
      });
      setSelectedFiles([]);
      setUploadProgress(0);
      setError(null);
    } catch (error) {
      console.error('Erreur lors de l\'opération:', error);
      setError('Erreur lors de l\'enregistrement du dossier médical');
    }
  };

  const handleEdit = (record: MedicalRecord) => {
    setEditingRecord(record);
    setFormData({
      date: new Date(record.date).toISOString().split('T')[0],
      diagnostic: record.diagnostic,
      prescription: record.prescription,
      notes: record.notes || ''
    });
    setSelectedFiles([]);
    setShowForm(true);
  };

  const handleDelete = async (recordId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce dossier médical ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`https://medical-back-react.onrender.com/api/medical-records/${recordId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchRecords();
        setError(null);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        setError('Erreur lors de la suppression du dossier médical');
      }
    }
  };

  const downloadAttachment = async (filename: string, originalName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://medical-back-react.onrender.com/api/medical-records/attachment/${filename}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      setError('Erreur lors du téléchargement du fichier');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-8 border w-full max-w-4xl shadow-xl rounded-xl bg-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Dossier Médical - {patient?.prenom} {patient?.nom}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Historique des consultations et prescriptions
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => {
              setShowForm(true);
              setEditingRecord(null);
              setFormData({
                date: new Date().toISOString().split('T')[0],
                diagnostic: '',
                prescription: '',
                notes: ''
              });
              setSelectedFiles([]);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle Consultation
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-6 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">
              {editingRecord ? 'Modifier la Consultation' : 'Nouvelle Consultation'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diagnostic
                </label>
                <textarea
                  value={formData.diagnostic}
                  onChange={(e) => setFormData({ ...formData, diagnostic: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prescription
                </label>
                <textarea
                  value={formData.prescription}
                  onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pièces jointes
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Téléverser des fichiers</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          multiple
                          onChange={handleFileChange}
                          accept=".jpg,.jpeg,.png,.pdf"
                        />
                      </label>
                      <p className="pl-1">ou glisser-déposer</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, PDF jusqu'à 5MB
                    </p>
                  </div>
                </div>
                {selectedFiles.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Paperclip className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-sm text-gray-600">{file.name}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {editingRecord ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {records.map((record) => (
            <div key={record._id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold">
                    Consultation du {new Date(record.date).toLocaleDateString()}
                  </h4>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(record)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded-full"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(record._id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <h5 className="text-sm font-medium text-gray-700">Diagnostic</h5>
                  <p className="text-gray-600">{record.diagnostic}</p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-700">Prescription</h5>
                  <p className="text-gray-600">{record.prescription}</p>
                </div>
                {record.notes && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700">Notes</h5>
                    <p className="text-gray-600">{record.notes}</p>
                  </div>
                )}
                {record.attachments && record.attachments.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700">Pièces jointes</h5>
                    <ul className="mt-2 space-y-2">
                      {record.attachments.map((attachment, index) => (
                        <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <Paperclip className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {attachment.originalName}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({formatFileSize(attachment.size)})
                            </span>
                          </div>
                          <button
                            onClick={() => downloadAttachment(attachment.filename, attachment.originalName)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {records.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Aucun dossier médical enregistré pour ce patient.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalRecords;