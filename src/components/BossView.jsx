// src/components/BossView.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../firebase/firestore';

export default function BossView() {
  const { sessionCode } = useParams();
  const [bossHp, setBossHp] = useState(100);
  const [recentApproved, setRecentApproved] = useState([]);
  const [isDamaged, setIsDamaged] = useState(false);
  const prevHpRef = useRef(bossHp);

  // Paths to GIFs in public/assets
  // Direct path for public assets
  const normalSrc = '/assets/boss.gif';  // mapnaam is 'assests' volgens je bestandssysteem
  const damagedSrc = '/assets/boss-damaged.gif';

  useEffect(() => {
    // Listen to boss health changes
    const sessionRef = doc(db, 'sessions', sessionCode);
    const unsubscribeSession = onSnapshot(sessionRef, snap => {
      const data = snap.data();
      if (data?.bossHp !== undefined) {
        const newHp = data.bossHp;
        if (newHp < prevHpRef.current) {
          setIsDamaged(true);
          setTimeout(() => setIsDamaged(false), 1000);
        }
        prevHpRef.current = newHp;
        setBossHp(newHp);
      }
    });

    // Listen to approved submissions
    const studentsRef = collection(db, 'sessions', sessionCode, 'students');
    const unsubscribeStudents = onSnapshot(studentsRef, snap => {
      const approved = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.lastApprovedAt)
        .sort((a, b) => b.lastApprovedAt.toMillis() - a.lastApprovedAt.toMillis())
        .slice(0, 5);
      setRecentApproved(approved);
    });

    return () => {
      unsubscribeSession();
      unsubscribeStudents();
    };
  }, [sessionCode]);

  const healthPercent = Math.max(0, Math.min(100, bossHp));

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-6">
      {/* Boss GIF */}
      <img
        src={isDamaged ? damagedSrc : normalSrc}
        alt="Boss"
        onError={(e) => console.error('Failed to load image:', e.target.src)}
        style={{ imageRendering: 'pixelated' }}
        className="w-1/2 max-w-md mb-8 transition-all duration-300 ease-in-out"
      />

      {/* Health Bar */}
      <div className="w-full max-w-3xl bg-gray-700 rounded-full h-12 overflow-hidden mb-8">
        <div
          className="bg-red-600 h-full transition-all duration-500 ease-in-out"
          style={{ width: `${healthPercent}%` }}
        />
      </div>
      <p className="mb-8 text-xl">Boss Health: {healthPercent}%</p>

      {/* Recent approved submissions */}
      <div className="w-full max-w-3xl bg-gray-800 rounded p-4">
        <h3 className="text-lg font-semibold mb-2">Laatste goedkeuringen</h3>
        {recentApproved.length > 0 ? (
          <ul className="list-disc list-inside">
            {recentApproved.map(s => (
              <li key={s.id}>{s.name} heeft een opdracht voltooid</li>
            ))}
          </ul>
        ) : (
          <p>Nog geen goedkeuringen.</p>
        )}
      </div>
    </div>
  );
}
