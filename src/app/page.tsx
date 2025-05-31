'use client';

import { useState, useEffect } from 'react';
import WebGeniusApp from '@/components/webgenius-app';
import { LandingPage } from '@/components/landing-page';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  // Initialize with a default value
  const [showApp, setShowApp] = useState<boolean>(false);
  const { toast } = useToast();

  // Move localStorage logic to useEffect
  useEffect(() => {
    const saved = localStorage.getItem('webgenius-show-app');
    if (saved) {
      setShowApp(JSON.parse(saved));
    }
  }, []);

  const handleGetStarted = () => {
    try {
      setShowApp(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to start the application. Please try refreshing the page.',
      });
    }
  };

  // Return a consistent initial structure
  return (
    <div className="h-screen overflow-hidden">
      {showApp ? (
        <WebGeniusApp />
      ) : (
        <LandingPage onGetStarted={handleGetStarted} />
      )}
    </div>
  );
}
