// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import JoinScreen from './components/JoinScreen';
import AssignmentSelection from './components/AssignmentSelection';
import ProgressScreen from './components/ProgressScreen';
import TeacherDashboard from './components/TeacherDashboard';
import BossView from './components/BossView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public entry point: join screen */}
        <Route path="/" element={<JoinScreen />} />

        {/* Student flow */}
        <Route
          path="/session/:sessionCode/student/:studentId"
          element={<AssignmentSelection />}
        />
        <Route
          path="/session/:sessionCode/student/:studentId/progress"
          element={<ProgressScreen />}
        />

        {/* Teacher flow */}
        <Route
          path="/session/:sessionCode/teacher"
          element={<TeacherDashboard />}
        />
        <Route
          path="/session/:sessionCode/boss"
          element={<BossView />}
        />

        {/* Fallback to join */}
        <Route path="*" element={<JoinScreen />} />
      </Routes>
    </BrowserRouter>
  );
}