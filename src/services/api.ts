import axios from 'axios';
import { User, FormData, UserResponse } from '../types/user';

import { API_BASE_URL } from '../config'; // Import de l'URL de l'API

// Add axios interceptor for error handling
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const getUsers = async (): Promise<User[]> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

const createUser = async (userData: FormData): Promise<UserResponse> => {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_BASE_URL}/users`, userData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

const updateUser = async (id: string, userData: Partial<FormData>): Promise<UserResponse> => {
  const token = localStorage.getItem('token');
  
  // Remove password if it's empty
  if (userData.password === '') {
    delete userData.password;
  }
  
  const response = await axios.put(`${API_BASE_URL}/users/${id}`, userData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

const deleteUser = async (id: string): Promise<UserResponse> => {
  const token = localStorage.getItem('token');
  const response = await axios.delete(`${API_BASE_URL}/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const userService = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};