// src/components/ProgressScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/firestore';

export default function ProgressScreen() {
  const { sessionCode, studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const prevApprovedRef = useRef(null);

  useEffect(() => {
    const studentRef = doc(db, 'sessions', sessionCode, 'students', studentId);
    const unsubscribe = onSnapshot(studentRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setStudent(data);

      // Als er een lopende opdracht is, laad details:
      if (data.currentAssignment) {
        const aRef = doc(
          db,
          'sessions',
          sessionCode,
          'assignments',
          data.currentAssignment
        );
        const aSnap = await getDoc(aRef);
        if (aSnap.exists()) {
          // include ID in assignment state
          setAssignment({ id: aSnap.id, ...aSnap.data() });
        }
      }

      // Popup bij nieuwe goedkeuring:
      const approvedAt = data.lastApprovedAt?.toMillis();
      if (approvedAt && prevApprovedRef.current !== approvedAt) {
        prevApprovedRef.current = approvedAt;
        setShowPopup(true);
      }

      // Form disable na inzending:
      if (data.submittedAt) setSubmitted(true);
    }, (err) => {
      console.error(err);
      setError('Kon studentgegevens niet laden.');
    });

    return () => unsubscribe();
  }, [sessionCode, studentId]);

  // Loading / error state
  if (error) return <p className="text-center text-red-500 mt-10">{error}</p>;
  if (!student) return <p className="text-center mt-10">Laden...</p>;

  // Na goedkeuring:
  if (!student.currentAssignment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <h2 className="text-2xl font-semibold mb-4">Opdracht goedgekeurd!</h2>
        <p className="mb-6">Je hebt nu {student.xp} XP en {student.assignmentsCompleted} opdrachten voltooid.</p>
        <button
          onClick={() => navigate(`/session/${sessionCode}/student/${studentId}`)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Terug naar opdrachten
        </button>
      </div>
    );
  }

  // Wacht op assignment-details
  if (!assignment) {
    return <p className="text-center mt-10">Opdracht laden...</p>;
  }

  // Handler voor code-verzending:
  const handleSubmitCode = async (e) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    try {
      // Voeg inzending toe, nu inclusief assignmentId
      await addDoc(
        collection(db, 'sessions', sessionCode, 'submissions'),
        {
          studentId,
          studentName: student.name,
          code: codeInput.trim(),
          difficulty: assignment.difficulty,
          assignmentId: assignment.id,
          submittedAt: serverTimestamp()
        }
      );
      // Markeer als ingediend
      const studentRef = doc(db, 'sessions', sessionCode, 'students', studentId);
      await updateDoc(studentRef, { submittedAt: serverTimestamp() });
      setSubmitted(true);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Kon code niet versturen.');
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 p-6">
      {/* Goedkeurings-popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-xl font-semibold mb-2">Je opdracht is goedgekeurd!</h3>
            <p className="mb-4">Goed gedaan! Je XP is bijgewerkt.</p>
            <button
              onClick={() => setShowPopup(false)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Terug-knop */}
      <button
        onClick={() => navigate(`/session/${sessionCode}/student/${studentId}`)}
        className="absolute top-4 left-4 text-gray-600 hover:text-gray-900 text-2xl"
      >
        &#x2715;
      </button>

      {/* Student info */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">{student.name}</h2>
        <p>XP: {student.xp}</p>
      </div>

      {/* Assignment details */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-2xl font-bold mb-2">{assignment.title}</h3>
        <p className="mb-4 whitespace-pre-line">{assignment.description}</p>
      </div>

      {/* Code submission form */}
      <form onSubmit={handleSubmitCode} className="max-w-md">
        <label className="block mb-2">
          <span className="text-gray-700">Voer code in</span>
          <input
            type="text"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="bijv. ABC123"
            disabled={submitted}
          />
        </label>
        <button
          type="submit"
          disabled={submitted}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitted ? 'Wachten op goedkeuring...' : 'Verstuur code'}
        </button>
      </form>
    </div>
  );
}
