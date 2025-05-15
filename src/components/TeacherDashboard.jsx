// src/components/TeacherDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  arrayUnion,
  deleteField
} from 'firebase/firestore';
import { db } from '../firebase/firestore';

export default function TeacherDashboard() {
  const [sessionCode, setSessionCode] = useState('');
  const [xpConfig, setXpConfig] = useState({ makkelijk: 10, medium: 20, moeilijk: 30 });
  const [bossHp, setBossHp] = useState(100);
  const [sessions, setSessions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('makkelijk');

  // Laad alle sessies
  useEffect(() => {
    getDocs(collection(db, 'sessions')).then(snap => {
      const data = snap.docs
        .map(d => d.data())
        .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setSessions(data);
    });
  }, []);

  // Open bestaande of nieuwe sessie
  const openSession = code => {
    setSessionCode(code);

    // Realtime sessie-data
    const sessionRef = doc(db, 'sessions', code);
    onSnapshot(sessionRef, snap => {
      const data = snap.data();
      if (data) {
        setBossHp(data.bossHp);
        setXpConfig(data.xpConfig);
      }
    });

    // Laad assignments
    getDocs(collection(db, 'sessions', code, 'assignments')).then(snap =>
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // Realtime submissions
    onSnapshot(collection(db, 'sessions', code, 'submissions'), snap => {
      const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(subs);
    });
  };

  // Nieuwe sessie maken
  const createSession = async () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await setDoc(doc(db, 'sessions', code), {
      sessionCode: code,
      createdAt: serverTimestamp(),
      bossHp: 100,
      xpConfig
    });
    setSessions(prev => [
      { sessionCode: code, createdAt: { toMillis: () => Date.now() }, bossHp: 100, xpConfig },
      ...prev
    ]);
    openSession(code);
  };

  // Assignment toevoegen
  const handleAddAssignment = async e => {
    e.preventDefault();
    if (!title) return;
    await addDoc(collection(db, 'sessions', sessionCode, 'assignments'), {
      title,
      shortDescription,
      description,
      difficulty
    });
    setTitle('');
    setShortDescription('');
    setDescription('');
    setDifficulty('makkelijk');
  };

  // Inzending goedkeuren (met volledige history logging)
  const handleApprove = async sub => {
    const xpGain     = xpConfig[sub.difficulty] || 0;
    const studentRef = doc(db, 'sessions', sessionCode, 'students', sub.studentId);
    const studentSnap= await getDoc(studentRef);
    const studentData= studentSnap.data() || {};

    // Bouw object met updates
    const updateFields = {
      xp:                   (studentData.xp || 0) + xpGain,
      assignmentsCompleted: (studentData.assignmentsCompleted || 0) + 1,
      lastApprovedAt:       serverTimestamp(),
      currentAssignment:    deleteField(),

      // Volledige history entry
      history: arrayUnion({
        assignmentId: sub.assignmentId,
        submittedAt:  sub.submittedAt,
        approvedAt:   new Date()
      })
    };
    // keep completedAssignments array as well
    if (sub.assignmentId) {
      updateFields.completedAssignments = arrayUnion(sub.assignmentId);
    }

    // Schrijf alle updates
    await updateDoc(studentRef, updateFields);
    await updateDoc(doc(db, 'sessions', sessionCode), { bossHp: bossHp - xpGain });
    await deleteDoc(doc(db, 'sessions', sessionCode, 'submissions', sub.id));
  };

  // Inzending weigeren
  const handleReject = async sub => {
    await deleteDoc(doc(db, 'sessions', sessionCode, 'submissions', sub.id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {!sessionCode ? (
        <>
          <button
            onClick={createSession}
            className="bg-green-600 text-white px-4 py-2 rounded mb-4"
          >
            Start nieuwe sessie
          </button>
          <h3 className="text-xl font-semibold mb-2">Bestaande sessies</h3>
          <ul className="list-disc list-inside mb-6">
            {sessions.map(sess => (
              <li key={sess.sessionCode}>
                <button
                  onClick={() => openSession(sess.sessionCode)}
                  className="text-indigo-600 hover:underline"
                >
                  Sessie {sess.sessionCode} (
                  {new Date(sess.createdAt.toMillis()).toLocaleString()})
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-4">Sessie: {sessionCode}</h2>

          {/* Assignment Form */}
          <form onSubmit={handleAddAssignment} className="mb-6 space-y-2">
            <h3 className="text-xl font-semibold">Nieuwe opdracht</h3>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titel"
              className="w-full border rounded p-2"
            />
            <input
              value={shortDescription}
              onChange={e => setShortDescription(e.target.value)}
              placeholder="Korte beschrijving"
              className="w-full border rounded p-2"
            />
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Uitgebreide omschrijving"
              className="w-full border rounded p-2"
            />
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="border rounded p-2"
            >
              <option value="makkelijk">Makkelijk ({xpConfig.makkelijk} XP)</option>
              <option value="medium">Medium ({xpConfig.medium} XP)</option>
              <option value="moeilijk">Moeilijk ({xpConfig.moeilijk} XP)</option>
            </select>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded">
              Voeg opdracht toe
            </button>
          </form>

          {/* Inzendingen */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold">Inzendingen</h3>
            {submissions.length ? (
              submissions.map(sub => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between bg-gray-100 p-4 rounded mb-2"
                >
                  <div>
                    <p className="font-semibold">{sub.studentName}</p>
                    <p className="text-sm">Code: {sub.code}</p>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleApprove(sub)}
                      className="bg-green-500 text-white px-3 py-1 rounded"
                    >
                      Goedkeuren
                    </button>
                    <button
                      onClick={() => handleReject(sub)}
                      className="bg-red-500 text-white px-3 py-1 rounded"
                    >
                      Weigeren
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>Geen inzendingen.</p>
            )}
          </div>

          {/* Boss health */}
          <div>
            <h3 className="text-xl font-semibold">Boss Health</h3>
            <div className="w-full bg-gray-300 rounded h-6 mt-2">
              <div
                className="bg-red-600 h-6 rounded"
                style={{ width: `${(bossHp / 100) * 100}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
