import React, { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { User, FormData } from '../types/user';
import { userService } from '../services/api';
import { UserForm } from './UserForm';
import { UserList } from './UserList';

const initialFormData: FormData = {
  email: '',
  password: '',
  nom: '',
  prenom: '',
  role: 'medecin'
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await userService.getUsers();
      setUsers(data);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      setMessage(error.response?.data?.message || 'Erreur lors de la récupération des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (editingUser) {
        const updateData = {
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          role: formData.role,
          ...(formData.password ? { password: formData.password } : {})
        };
        await userService.updateUser(editingUser._id, updateData);
        setMessage('Utilisateur modifié avec succès');
      } else {
        await userService.createUser(formData);
        setMessage('Utilisateur créé avec succès');
      }

      setShowModal(false);
      await fetchUsers();
      resetForm();
    } catch (error: any) {
      console.error('Erreur lors de l\'opération:', error);
      setMessage(error.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      setIsLoading(true);
      try {
        await userService.deleteUser(id);
        setMessage('Utilisateur supprimé avec succès');
        await fetchUsers();
      } catch (error: any) {
        console.error('Erreur lors de la suppression:', error);
        setMessage(error.response?.data?.message || 'Une erreur est survenue lors de la suppression');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      nom: user.nom,
      prenom: user.prenom,
      role: user.role
    });
    setShowModal(true);
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
            setMessage(null);
          }}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
          disabled={isLoading}
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Nouvel Utilisateur
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('succès') 
            ? 'bg-green-50 text-green-700 border-l-4 border-green-500'
            : 'bg-red-50 text-red-700 border-l-4 border-red-500'
        }`}>
          {message}
        </div>
      )}

      <UserList
        users={users}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {showModal && (
        <UserForm
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          editingUser={editingUser}
          isLoading={isLoading}
          onClose={() => {
            setShowModal(false);
            resetForm();
            setMessage(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;