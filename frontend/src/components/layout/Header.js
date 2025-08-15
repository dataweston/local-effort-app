import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const logo = '/gallery/logo.png?text=Local+Effort&font=mono';

export const Header = () => {
    const [isOpen, setIsMenuOpen] = useState(false);

    // This effect locks the body scroll when the mobile menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        // Cleanup function to remove the style if the component unmounts
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    // Define navigation links for consistency
    const navLinks = [
        { path: "/services", name: "Services" },
        { path: "/pricing", name: "Pricing" },
        { path: "/menu", name: "Menus" },
        { path: "/about", name: "About" }
    ];

    return (
        <header className="py-6 px-4 md:px-8 lg:px-16 flex justify-between items-center relative">
            {/* --- Logo / Home Link --- */}
            <NavLink to="/" className="z-50" onClick={() => setIsMenuOpen(false)}>
                <img src={logo} alt="Local Effort Logo" className="h-10 w-auto" />
            </NavLink>

            {/* --- Desktop Navigation --- */}
            <nav className="hidden md:flex items-center space-x-2 font-mono text-sm">
                {navLinks.map(link => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        className="p-2 rounded hover:bg-gray-200 transition-colors"
                    >
                        {link.name}
                    </NavLink>
                ))}
                <NavLink
                    to="/crowdfunding"
                    className="p-2 px-4 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                >
                    Fundraiser
                </NavLink>
            </nav>

            {/* --- Mobile Menu Button (Animated Hamburger) --- */}
            <button
                onClick={() => setIsMenuOpen(!isOpen)}
                className="md:hidden z-50 w-8 h-6 flex flex-col justify-between"
                aria-label="Toggle menu"
            >
                <span
                    className={`block h-0.5 w-full bg-black transform transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-45 translate-y-[11px]' : ''}`}
                />
                <span
                    className={`block h-0.5 w-full bg-black transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-0' : 'opacity-100'}`}
                />
                <span
                    className={`block h-0.5 w-full bg-black transform transition-transform duration-300 ease-in-out ${isOpen ? '-rotate-45 -translate-y-[11px]' : ''}`}
                />
            </button>

            {/* --- Mobile Menu Overlay --- */}
            <div
                className={`md:hidden fixed inset-0 bg-[#F5F5F5] transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                <nav className="flex flex-col items-center justify-center h-full space-y-6 font-mono">
                    {navLinks.map((link, index) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsMenuOpen(false)} // Close menu on link click
                            className={`text-3xl uppercase transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
                            style={{ transitionDelay: isOpen ? `${150 + index * 50}ms` : '0ms' }}
                        >
                            {link.name}
                        </NavLink>
                    ))}
                    <NavLink
                        to="/crowdfunding"
                        onClick={() => setIsMenuOpen(false)}
                        className={`text-3xl uppercase bg-red-600 text-white px-6 py-3 rounded font-semibold transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
                        style={{ transitionDelay: isOpen ? `${150 + navLinks.length * 50}ms` : '0ms' }}
                    >
                        Fundraiser
                    </NavLink>
                </nav>
            </div>
        </header>
    );
};