// src/components/AssignmentSelection.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import { db } from '../firebase/firestore';

export default function AssignmentSelection() {
  const { sessionCode, studentId } = useParams();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [student, setStudent] = useState(null);
  const [xpConfig, setXpConfig] = useState({ makkelijk: 10, medium: 20, moeilijk: 30 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    // Load all assignments
    const fetchAssignments = async () => {
      try {
        const snap = await getDocs(collection(db, 'sessions', sessionCode, 'assignments'));
        setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
        setError('Kon opdrachten niet laden.');
      }
    };
    fetchAssignments();

    // Realtime listener for student progress flags
    const studentRef = doc(db, 'sessions', sessionCode, 'students', studentId);
    const unsubscribe = onSnapshot(studentRef, snap => {
      if (snap.exists()) {
        setStudent({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    }, err => {
      console.error(err);
      setError('Kon studentgegevens niet laden.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionCode, studentId]);

  const handleSelect = async () => {
    if (!selected) return;
    try {
      const studentRef = doc(db, 'sessions', sessionCode, 'students', studentId);
      await updateDoc(studentRef, {
        currentAssignment: selected.id,
        selectedAt: serverTimestamp(),
        // Reset submission and approval flags
        submittedAt: deleteField(),
        lastApprovedAt: deleteField()
      });
      navigate(`/session/${sessionCode}/student/${studentId}/progress`);
    } catch (err) {
      console.error(err);
      setError('Kon opdracht niet selecteren.');
    }
  };

  if (loading) return <p className="text-center mt-10">Laden...</p>;
  if (error) return <p className="text-center text-red-500 mt-10">{error}</p>;
  if (!student) return null;

  // Compute XP, level, completed assignments
  const xp = student.xp || 0;
  const xpPercent = xp % 100;
  const level = Math.floor(xp / 100) + 1;
  const done = Array.isArray(student.completedAssignments) ? student.completedAssignments : [];

  const difficulties = ['makkelijk', 'medium', 'moeilijk'];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-lg font-semibold">{student.name}</p>
          <p className="text-sm text-gray-600">Klascode: {sessionCode}</p>
        </div>
        <div className="w-1/2">
          <p className="text-sm mb-1">Level {level} • XP: {xp}/100</p>
          <div className="w-full bg-gray-300 rounded h-2">
            <div className="bg-indigo-600 h-2 rounded" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Kies een opdracht</h2>

      {difficulties.map(diff => (
        <div key={diff} className="mb-6">
          <h3 className="text-xl font-medium mb-2 capitalize">{diff}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments
              .filter(a => a.difficulty === diff)
              .map(a => {
                const isDone = done.includes(a.id);
                return (
                  <div
                    key={a.id}
                    onClick={() => !isDone && setSelected(a)}
                    className={`relative p-4 border rounded transition-shadow ${
                      isDone ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:shadow-lg cursor-pointer'
                    }`}
                  >
                    {isDone && (
                      <div className="absolute top-2 right-2 flex items-center text-green-600">
                        <span className="text-xl mr-1">✔</span>
                        <span className="text-sm">+{xpConfig[diff]} XP</span>
                      </div>
                    )}
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-sm text-gray-600 truncate">{a.shortDescription}</p>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div className="bg-white rounded-lg p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-semibold mb-4">{selected.title}</h3>
            <p className="mb-4 whitespace-pre-line">{selected.description}</p>
            <button
              onClick={handleSelect}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Kies deze opdracht
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
