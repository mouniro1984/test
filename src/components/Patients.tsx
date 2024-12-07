import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, FileIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import MedicalRecords from './MedicalRecords';
import { API_BASE_URL } from '../config';

interface Patient {
  _id: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  telephone: string;
  email: string;
}

interface FormErrors {
  telephone?: string;
  email?: string;
  dateNaissance?: string;
  nom?: string;
  prenom?: string;
}

const countryCodes = [
  { code: '+216', country: 'Tunisie' },
  { code: '+33', country: 'France' },
  { code: '+1', country: 'États-Unis/Canada' },
  { code: '+44', country: 'Royaume-Uni' },
  { code: '+49', country: 'Allemagne' },
  { code: '+34', country: 'Espagne' },
  { code: '+39', country: 'Italie' },
  { code: '+212', country: 'Maroc' },
  { code: '+213', country: 'Algérie' },
  { code: '+20', country: 'Égypte' },
];

const extractPhoneDetails = (fullPhone: string) => {
  const phoneMatch = fullPhone.match(/^(\+\d+)(.*)$/);
  if (phoneMatch) {
    return {
      countryCode: phoneMatch[1],
      phoneNumber: phoneMatch[2].trim()
    };
  }
  return {
    countryCode: '+216',
    phoneNumber: fullPhone.replace(/\D/g, '')
  };
};

const Patients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showMedicalRecords, setShowMedicalRecords] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage] = useState(4);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    dateNaissance: '',
    telephone: '',
    countryCode: '+216',
    email: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Pagination calculations
  const filteredPatients = patients.filter(patient =>
    patient.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastPatient = currentPage * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      dateNaissance: '',
      telephone: '',
      countryCode: '+216',
      email: '',
    });
    setFormErrors({});
    setEditingPatient(null);
  };

  const handleEdit = (patient: Patient) => {
    const { countryCode, phoneNumber } = extractPhoneDetails(patient.telephone);
    
    setEditingPatient(patient);
    setFormData({
      nom: patient.nom,
      prenom: patient.prenom,
      dateNaissance: new Date(patient.dateNaissance).toISOString().split('T')[0],
      telephone: phoneNumber,
      countryCode: countryCode,
      email: patient.email,
    });
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    const nameRegex = /^[a-zA-ZÀ-ÿ\s-]+$/;
    if (!nameRegex.test(formData.nom)) {
      errors.nom = 'Le nom ne doit contenir que des lettres, espaces et tirets';
      isValid = false;
    }

    if (!nameRegex.test(formData.prenom)) {
      errors.prenom = 'Le prénom ne doit contenir que des lettres, espaces et tirets';
      isValid = false;
    }

    if (!/^\d{7}$/.test(formData.telephone)) {
      errors.telephone = 'Le numéro de téléphone doit contenir exactement 7 chiffres';
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = 'Veuillez entrer une adresse email valide';
      isValid = false;
    }

    const birthDate = new Date(formData.dateNaissance);
    const currentDate = new Date();
    if (birthDate > currentDate) {
      errors.dateNaissance = 'La date de naissance ne peut pas être dans le futur';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const patientData = {
        nom: formData.nom,
        prenom: formData.prenom,
        dateNaissance: formData.dateNaissance,
        telephone: `${formData.countryCode}${formData.telephone}`,
        email: formData.email
      };

      let response;
      if (editingPatient) {
        response = await axios.put(
          `${API_BASE_URL}/patients/${editingPatient._id}`,
          patientData,
          { headers }
        );
        setMessage('Patient modifié avec succès');
      } else {
        response = await axios.post(
          `${API_BASE_URL}/patients`,
          patientData,
          { headers }
        );
        setMessage('Patient ajouté avec succès');
      }

      if (response.status === 200 || response.status === 201) {
        setShowModal(false);
        fetchPatients();
        resetForm();
      }
    } catch (error) {
      console.error('Erreur lors de l\'opération:', error);
      setMessage('Une erreur est survenue');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'telephone') {
      const sanitizedValue = value.replace(/\D/g, '').slice(0, 7);
      setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPatients(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des patients:', error);
      setMessage('Une erreur est survenue lors de la récupération des patients');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce patient ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/patients/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setMessage('Patient supprimé avec succès');
        fetchPatients();
      } catch (error) {
        console.error('Erreur lors de la suppression du patient:', error);
        setMessage('Une erreur est survenue lors de la suppression');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleViewMedicalRecords = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowMedicalRecords(true);
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    // Reset to first page when search term changes
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {message && (
        <div className={`mb-6 p-4 rounded-lg shadow-sm border-l-4 ${
          message.includes('succès') 
            ? 'bg-green-50 border-green-500 text-green-700' 
            : 'bg-red-50 border-red-500 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Patients</h1>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full md:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transform transition-all duration-200 hover:scale-105 shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau Patient
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Prénom
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date de Naissance
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPatients.length > 0 ? (
                currentPatients.map((patient) => (
                  <tr key={patient._id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {patient.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {patient.prenom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(patient.dateNaissance).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {patient.telephone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {patient.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleViewMedicalRecords(patient._id)}
                          className="text-green-600 hover:text-green-800 transition-colors p-1 hover:bg-green-100 rounded-full"
                          title="Dossier médical"
                        >
                          <FileIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(patient)}
                          className="text-blue-600 hover:text-blue-800 transition-colors p-1 hover:bg-blue-100 rounded-full"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(patient._id)}
                          className="text-red-600 hover:text-red-800 transition-colors p-1 hover:bg-red-100 rounded-full"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Aucun patient trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredPatients.length > 0 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Précédent
              </button>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">{indexOfFirstPatient + 1}</span>
                  {' à '}
                  <span className="font-medium">
                    {Math.min(indexOfLastPatient, filteredPatients.length)}
                  </span>
                  {' sur '}
                  <span className="font-medium">{filteredPatients.length}</span>
                  {' patients'}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Précédent</span>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => paginate(index + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === index + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === totalPages
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Suivant</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-8 border w-full max-w-md shadow-xl rounded-xl bg-white">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingPatient ? 'Modifier le Patient' : 'Nouveau Patient'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {editingPatient 
                  ? 'Modifiez les informations du patient'
                  : 'Remplissez les informations pour ajouter un nouveau patient'}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    formErrors.nom ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.nom && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.nom}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                <input
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    formErrors.prenom ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.prenom && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.prenom}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de Naissance
                </label>
                <input
                  type="date"
                  name="dateNaissance"
                  value={formData.dateNaissance}
                  onChange={handleInputChange}
                  max={today}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    formErrors.dateNaissance ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.dateNaissance && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.dateNaissance}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                <div className="flex space-x-2">
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleInputChange}
                    className="w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    {countryCodes.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.country} ({country.code})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    placeholder="7 chiffres"
                    className={`w-2/3 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      formErrors.telephone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                </div>
                {formErrors.telephone && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.telephone}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {editingPatient ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMedicalRecords && selectedPatientId && (
        <MedicalRecords
          patientId={selectedPatientId}
          onClose={() => {
            setShowMedicalRecords(false);
            setSelectedPatientId(null);
          }}
          patient={patients.find(p => p._id === selectedPatientId)}
        />
      )}
    </div>
  );
};

export default Patients;