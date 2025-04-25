// src/components/JoinScreen.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';

export default function JoinScreen() {
  const [sessionCode, setSessionCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!sessionCode.trim() || !name.trim()) {
      setError('Vul zowel de klascode als je naam in.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Reference to students subcollection
      const studentsCol = collection(db, 'sessions', sessionCode.trim(), 'students');
      // Create student document
      const docRef = await addDoc(studentsCol, {
        name: name.trim(),
        xp: 0,
        assignmentsCompleted: 0,
        joinedAt: serverTimestamp(),
      });
      // Navigate to student view
      navigate(`/session/${sessionCode.trim()}/student/${docRef.id}`);
    } catch (err) {
      console.error('Fout bij joinen:', err);
      setError('Kon niet verbinden met de sessie. Controleer de klascode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleJoin} className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-center">Join Sessie</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <label className="block mb-2">
          <span className="text-gray-700">Klascode</span>
          <input
            type="text"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Bijv. 123456"
          />
        </label>
        <label className="block mb-4">
          <span className="text-gray-700">Naam</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Jouw naam"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Bezig...' : 'Join'}
        </button>
      </form>
    </div>
  );
}
