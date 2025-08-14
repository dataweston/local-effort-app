import React from 'react';
import { Link } from 'react-router-dom';

export const ServiceCard = ({ to, title, description }) => (
    <Link to={to} className="block bg-[#F5F5F5] p-8 space-y-4 hover:bg-gray-200 cursor-pointer">
        <h4 className="text-2xl font-bold uppercase">{title}</h4>
        <p className="font-mono text-gray-600 h-24">{description}</p>
        <span className="font-mono text-sm underline">Learn More &rarr;</span>
    </Link>
);