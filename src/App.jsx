// src/App.jsx
import React, { useState } from 'react';
import { PlanProvider, usePlan } from './context/PlanContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { Navbar } from './components/layout/Navbar';
import { WeeklyScheduler } from './components/scheduler/WeeklyScheduler';
import { MonthlyScheduler } from './components/scheduler/MonthlyScheduler';
import { ContinuousTimeline24h } from './components/timeline/ContinuousTimeline24h';
import { TeamManager } from './components/teams/TeamManager';
import { AgentManager } from './components/agents/AgentManager';
import { EmployeePortal } from './components/portal/EmployeePortal';
import { AiAgentPlannerModal } from './components/scheduler/AiAgentPlannerModal';
import { Toast } from './components/common/Toast';
import './styles/components.css';

function MainLayout() {
  const { currentView, period } = usePlan();
  const { isAuthenticated, isAdmin, isMustChangePassword } = useAuth();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // If not authenticated, render Login Page
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toast />
      </>
    );
  }

  return (
    <div className="app-container">
      <Navbar onOpenAiModal={() => setIsAiModalOpen(true)} />

      <main className="main-content">
        {isAdmin ? (
          <>
            {currentView === 'planner' && (
              period === 'week' ? (
                <WeeklyScheduler onOpenAiModal={() => setIsAiModalOpen(true)} />
              ) : (
                <MonthlyScheduler onOpenAiModal={() => setIsAiModalOpen(true)} />
              )
            )}
            {currentView === 'timeline' && <ContinuousTimeline24h />}
            {currentView === 'teams' && <TeamManager />}
            {currentView === 'agents' && <AgentManager />}
          </>
        ) : (
          <EmployeePortal />
        )}
      </main>

      {/* Pioneers AI Autonomous Planning Agent Modal */}
      {isAdmin && (
        <AiAgentPlannerModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
        />
      )}

      {/* Mandatory First-Time Password Change Modal */}
      <ChangePasswordModal isOpen={isMustChangePassword} />

      {/* Global Toast System */}
      <Toast />
    </div>
  );
}

function AppWithAuth() {
  const { agents, updateAgentPassword } = usePlan();

  return (
    <AuthProvider agents={agents} updateAgentPasswordInDb={updateAgentPassword}>
      <MainLayout />
    </AuthProvider>
  );
}

export default function App() {
  return (
    <PlanProvider>
      <AppWithAuth />
    </PlanProvider>
  );
}
