import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { API_BASE_URL } from '../config';

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);

interface Appointment {
  _id: string;
  date: string;
  patientId: string;
}

interface Patient {
  _id: string;
  name: string;
}

const Dashboard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const headers = {
          'Authorization': `Bearer ${token}`
        };

        const appointmentsResponse = await axios.get(`${API_BASE_URL}/appointments`, { headers });
        const patientsResponse = await axios.get(`${API_BASE_URL}/patients`, { headers });

        setAppointments(appointmentsResponse.data);
        setPatients(patientsResponse.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getAppointmentsGrouped = () => {
    const grouped: { [key: string]: number } = {};
    
    if (timeFrame === 'weekly') {
      // Get current week's start and end
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Start from Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      
      // Create an array of all days in the week
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      // Initialize all days with 0 appointments
      daysInWeek.forEach(day => {
        const dayKey = format(day, 'EEEE dd/MM', { locale: fr });
        grouped[dayKey] = 0;
      });

      // Count appointments for each day
      appointments.forEach(apt => {
        const aptDate = parseISO(apt.date);
        // Check if appointment is in current week
        if (aptDate >= weekStart && aptDate <= weekEnd) {
          // Format the date to match the key format
          const dayKey = format(aptDate, 'EEEE dd/MM', { locale: fr });
          grouped[dayKey] = (grouped[dayKey] || 0) + 1;
        }
      });

      // Sort days of the week
      const sortedGrouped: { [key: string]: number } = {};
      daysInWeek.forEach(day => {
        const dayKey = format(day, 'EEEE dd/MM', { locale: fr });
        sortedGrouped[dayKey] = grouped[dayKey];
      });
      return sortedGrouped;

    } else if (timeFrame === 'monthly') {
      appointments.forEach(apt => {
        const date = new Date(apt.date);
        const key = format(date, 'MM/yyyy');
        grouped[key] = (grouped[key] || 0) + 1;
      });
    } else {
      appointments.forEach(apt => {
        const date = new Date(apt.date);
        const key = format(date, 'yyyy');
        grouped[key] = (grouped[key] || 0) + 1;
      });
    }

    return grouped;
  };

  const getNumberOfPatients = () => {
    return patients.length;
  };

  const getUpcomingAppointments = () => {
    const today = new Date();
    return appointments.filter(apt => new Date(apt.date) > today).length;
  };

  const getTodaysAppointments = () => {
    const today = new Date();
    return appointments.filter(apt => isSameDay(parseISO(apt.date), today)).length;
  };

  const chartData = () => {
    const grouped = getAppointmentsGrouped();
    return {
      labels: Object.keys(grouped),
      datasets: [
        {
          label: 'Rendez-vous',
          data: Object.values(grouped),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Nombre de rendez-vous',
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            return context[0].label;
          },
          label: (context: any) => {
            return `${context.parsed.y} rendez-vous`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h3 className="text-xl font-semibold">Nombre de patients</h3>
            <p className="text-3xl font-bold">{getNumberOfPatients()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h3 className="text-xl font-semibold">Rendez-vous à venir</h3>
            <p className="text-3xl font-bold">{getUpcomingAppointments()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h3 className="text-xl font-semibold">Rendez-vous aujourd'hui</h3>
            <p className="text-3xl font-bold">{getTodaysAppointments()}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setTimeFrame('weekly')}
            className={`px-6 py-3 rounded-lg transition-colors duration-200 ${
              timeFrame === 'weekly' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Hebdomadaire
          </button>
          <button
            onClick={() => setTimeFrame('monthly')}
            className={`px-6 py-3 rounded-lg transition-colors duration-200 ${
              timeFrame === 'monthly' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setTimeFrame('yearly')}
            className={`px-6 py-3 rounded-lg transition-colors duration-200 ${
              timeFrame === 'yearly' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Annuel
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <Line data={chartData()} options={chartOptions} />
      </div>
    </div>
  );
};

export default Dashboard;