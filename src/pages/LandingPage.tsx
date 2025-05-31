import { useState } from 'react';

export default function LandingPage() {
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');

  return (
    <div className="min-h-screen">
      {/* Existing content of the landing page */}

      {/* Settings Section */}
      <div className="fixed top-20 right-4 p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Settings</h3>

        <div className="mb-4">
          <label className="block mb-2">Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-2">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="en">English</option>
            <option value="id">Indonesia</option>
          </select>
        </div>
      </div>

      {/* Existing content of the landing page */}
    </div>
  );
}