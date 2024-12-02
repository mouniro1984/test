export interface User {
    _id: string;
    email: string;
    nom: string;
    prenom: string;
    role: 'admin' | 'medecin';
  }
  
  export interface FormData {
    email: string;
    password: string;
    nom: string;
    prenom: string;
    role: 'admin' | 'medecin';
  }
  
  export interface CreateUserData extends FormData {}
  
  export interface UpdateUserData extends Partial<FormData> {
    email: string;
    nom: string;
    prenom: string;
    role: 'admin' | 'medecin';
  }