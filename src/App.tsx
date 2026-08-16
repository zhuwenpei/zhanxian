import React, { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from './store/simulationStore';
import MapView from './components/MapView';
import SetupPanel from './components/SetupPanel';
import CasualtyPanel from './components/CasualtyPanel';
import DateDisplay from './components/DateDisplay';
import SimulationControls from './components/SimulationControls';
import ResultDialog from './components/ResultDialog';
import ReplayControls from './components/ReplayControls';
import PWARegistrationAndInstall from './components/PWARegistrationAndInstall';

export default function App() {
  const status = useSimulationStore(s => s.status);
  const tick = useSimulationStore(s => s.tick);
  const speed = useSimulationStore(s => s.speed);
  
  const [showResultDialog, setShowResultDialog] = useState(true);

  const tickRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Automatically show result dialog when the war ends
  useEffect(() => {
    if (status === 'finished') {
      setShowResultDialog(true);
    }
  }, [status]);

  // Reset map style to osm when returning to setup
  useEffect(() => {
    if (status === 'setup') {
      useSimulationStore.getState().setMapStyle('osm');
    }
  }, [status]);

  // Initial show when game starts
  useEffect(() => {
    if (status === 'running' && tick === 0) {
      setShowResultDialog(true);
    }
  }, [status, tick]);

  useEffect(() => {
    if (status !== 'running') return;
    lastTimeRef.current = performance.now();
    
    const loop = (time: number) => {
      const delay = 1000 / (speed * 5);
      if (time - lastTimeRef.current >= delay) {
        useSimulationStore.getState().runTick();
        lastTimeRef.current = time;
      }
      tickRef.current = requestAnimationFrame(loop);
    };
    
    tickRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(tickRef.current);
  }, [status, speed]);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#050b14] text-white font-sans selection:bg-indigo-500/30">
      {/* Dynamic Background Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <MapView />
      
      {status === 'setup' && <PWARegistrationAndInstall />}
      
      <div className="absolute inset-0 pointer-events-none flex flex-col p-4 md:p-6 lg:p-8">
        {status === 'setup' ? (
          <div className="pointer-events-none h-full flex items-center justify-center">
            <SetupPanel />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start w-full gap-4">
              <div className="pointer-events-auto">
                <CasualtyPanel />
              </div>
              <div className="pointer-events-auto">
                <DateDisplay />
              </div>
            </div>

            <div className="mt-auto flex flex-col items-center pb-2 md:pb-4 w-full max-w-full overflow-visible">
              {status !== 'finished' && (
                <div className="pointer-events-auto max-w-full flex justify-center px-2 z-40">
                  <SimulationControls />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {status === 'finished' && !showResultDialog && (
        <ReplayControls onViewReport={() => setShowResultDialog(true)} />
      )}

      {status === 'finished' && showResultDialog && (
        <ResultDialog onClose={() => setShowResultDialog(false)} />
      )}
    </div>
  );
}

