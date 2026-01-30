import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScheduleGrid } from './components/ScheduleGrid';
import { TimeOffManager } from './components/TimeOffManager';
import { AvailabilityManager } from './components/AvailabilityManager';

const queryClient = new QueryClient();

function App() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'timeoff' | 'availability'>('schedule');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-3xl font-bold text-gray-900">SwiftShift</h1>
            <p className="text-gray-600">Better scheduling for tutoring centers</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              className={`rounded-md px-3 py-2 text-sm font-medium ${activeTab === 'schedule' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border'}`}
              onClick={() => setActiveTab('schedule')}
            >
              Schedule
            </button>
            <button
              className={`rounded-md px-3 py-2 text-sm font-medium ${activeTab === 'timeoff' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border'}`}
              onClick={() => setActiveTab('timeoff')}
            >
              Time Off
            </button>
            <button
              className={`rounded-md px-3 py-2 text-sm font-medium ${activeTab === 'availability' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border'}`}
              onClick={() => setActiveTab('availability')}
            >
              Availability
            </button>
          </div>
          {activeTab === 'schedule' && <ScheduleGrid />}
          {activeTab === 'timeoff' && <TimeOffManager />}
          {activeTab === 'availability' && <AvailabilityManager />}
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
