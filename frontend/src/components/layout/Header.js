import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const logo = '/gallery/logo.png?text=Local+Effort&font=mono';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="p-4 md:p-8 border-b border-gray-900 relative">
      <div className="flex justify-between items-center">
        <a href="/#/" onClick={closeMenu}>
          <img src={logo} alt="Local Effort Logo" className="h-10 w-auto cursor-pointer" />
        </a>
        <nav className="hidden md:flex items-center space-x-2 font-mono text-sm">
          <Link to="/services" className="hover:bg-gray-200 rounded p-2 transition-colors">Services</Link>
          <Link to="/pricing" className="hover:bg-gray-200 rounded p-2 transition-colors">Pricing</Link>
          <Link to="/menu" className="hover:bg-gray-200 rounded p-2 transition-colors">Menus</Link>
          <Link to="/about" className="hover:bg-gray-200 rounded p-2 transition-colors">About</Link>
          <Link to="/crowdfunding" className="bg-red-600 text-white rounded font-semibold p-2 px-4 hover:bg-red-700 transition-colors">Fundraiser</Link>
        </nav>
        <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      </div>
      {isMenuOpen && (
        <nav className="md:hidden absolute top-full left-0 w-full bg-[#F5F5F5] border-b border-l border-r border-gray-900 font-mono text-center z-50">
          <Link to="/services" onClick={closeMenu} className="block p-4 border-t border-gray-300">Services</Link>
          <Link to="/pricing" onClick={closeMenu} className="block p-4 border-t border-gray-300">Pricing</Link>
          <Link to="/menu" onClick={closeMenu} className="block p-4 border-t border-gray-300">Menus</Link>
          <Link to="/about" onClick={closeMenu} className="block p-4 border-t border-gray-300">About</Link>
          <Link to="/crowdfunding" onClick={closeMenu} className="block p-4 border-t border-gray-300 bg-red-100 font-semibold">Fundraiser</Link>
        </nav>
      )}
    </header>
  );
};