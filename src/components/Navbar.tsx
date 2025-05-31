import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="...">
      <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
        <img src="/logo.png" alt="WebGenius Logo" className="h-8 w-8" />
        <span className="ml-2 text-xl font-bold">WebGenius</span>
      </div>
      // ...existing code...
    </nav>
  );
}