import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface Patient {
  _id: string;
  nom: string;
  prenom: string;
}

interface Appointment {
  _id: string;
  patient: Patient | null;
  date: string;
  heure: string;
  motif: string;
}

const Appointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    patient: '',
    date: '',
    heure: '',
    motif: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [appointmentsPerPage] = useState(5);

  const today = new Date().toISOString().split('T')[0];

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const futureAppointments = response.data.filter((appointment: Appointment) => {
        const appointmentDate = new Date(appointment.date);
        return appointmentDate >= new Date(today);
      });

      setAppointments(futureAppointments);
    } catch (error) {
      console.error('Erreur lors de la récupération des rendez-vous:', error);
      setMessage('Erreur lors de la récupération des rendez-vous');
    }
  };

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setPatients(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des patients:', error);
      setMessage('Erreur lors de la récupération des patients');
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, []);

  const handleTimeChange = (time: string) => {
    const [hours] = time.split(':').map(Number);
    if (hours >= 8 && hours < 18) {
      setTimeError(null);
      setFormData({ ...formData, heure: time });
    } else {
      setTimeError('Les rendez-vous sont possibles uniquement entre 8h et 18h');
      setFormData({ ...formData, heure: '' });
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      patient: appointment.patient?._id || '',
      date: new Date(appointment.date).toISOString().split('T')[0],
      heure: appointment.heure,
      motif: appointment.motif,
    });
    setShowModal(true);
  };

  const handleDelete = async (appointmentId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/appointments/${appointmentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setMessage('Rendez-vous supprimé avec succès');
        fetchAppointments();
      } catch (error) {
        console.error('Erreur lors de la suppression du rendez-vous:', error);
        setMessage('Erreur lors de la suppression du rendez-vous');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const [hours] = formData.heure.split(':').map(Number);
    if (hours < 8 || hours >= 18) {
      setTimeError('Les rendez-vous sont possibles uniquement entre 8h et 18h');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      if (editingAppointment) {
        // Update existing appointment
        await axios.put(
          `${API_BASE_URL}/appointments/${editingAppointment._id}`,
          formData,
          { headers }
        );
        setMessage('Rendez-vous modifié avec succès');
      } else {
        // Create new appointment
        await axios.post(
          `${API_BASE_URL}/appointments`,
          formData,
          { headers }
        );
        setMessage('Rendez-vous ajouté avec succès');
      }

      setShowModal(false);
      setEditingAppointment(null);
      setFormData({
        patient: '',
        date: '',
        heure: '',
        motif: '',
      });
      setTimeError(null);
      fetchAppointments();
    } catch (error) {
      console.error('Erreur lors de l\'opération sur le rendez-vous:', error);
      setMessage('Erreur lors de l\'opération sur le rendez-vous');
    }
  };

  const formatPatientName = (patient: Patient | null) => {
    if (!patient) return 'Patient non disponible';
    return `${patient.nom || ''} ${patient.prenom || ''}`.trim() || 'Nom non disponible';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Date invalide';
    }
  };

  const indexOfLastAppointment = currentPage * appointmentsPerPage;
  const indexOfFirstAppointment = indexOfLastAppointment - appointmentsPerPage;
  const currentAppointments = appointments.slice(indexOfFirstAppointment, indexOfLastAppointment);

  const nextPage = () => {
    if (currentAppointments.length === appointmentsPerPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="p-6">
      {message && (
        <div className={`p-4 mb-4 rounded-md ${
          message.includes('succès') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Rendez-vous</h1>
        <button
          onClick={() => {
            setEditingAppointment(null);
            setFormData({
              patient: '',
              date: '',
              heure: '',
              motif: '',
            });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Rendez-vous
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Heure
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Motif
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentAppointments.map((appointment) => (
              <tr key={appointment._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatPatientName(appointment.patient)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDate(appointment.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {appointment.heure || 'Heure non spécifiée'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {appointment.motif || 'Aucun motif'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(appointment)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(appointment._id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between p-4">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 disabled:bg-gray-300"
          >
            Précédent
          </button>
          <button
            onClick={nextPage}
            disabled={currentAppointments.length < appointmentsPerPage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            Suivant
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {editingAppointment ? 'Modifier le rendez-vous' : 'Ajouter un nouveau rendez-vous'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Patient</label>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.patient}
                    onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner un patient</option>
                    {patients.map((patient) => (
                      <option key={patient._id} value={patient._id}>
                        {patient.nom} {patient.prenom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={today}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Heure</label>
                  <input
                    type="time"
                    value={formData.heure}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                  {timeError && <p className="text-red-500 text-sm">{timeError}</p>}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Motif</label>
                  <input
                    type="text"
                    value={formData.motif}
                    onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingAppointment ? 'Modifier' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingAppointment(null);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;