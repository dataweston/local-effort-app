import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scaleOnHover } from '../../utils/animations';

export const ServiceCard = ({ to, title, description }) => (
  <motion.div
    {...scaleOnHover}
    className="group rounded-xl bg-neutral-50 p-8 shadow-sm ring-1 ring-neutral-200 transition-shadow hover:shadow-md"
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
 >
    <Link to={to} className="block h-full">
      <h4 className="text-2xl font-bold uppercase tracking-tight">{title}</h4>
      <p className="font-mono text-neutral-600 min-h-[5.5rem] mt-2">{description}</p>
      <span className="font-mono text-sm inline-block underline underline-offset-4 group-hover:translate-x-0.5 transition-transform">
        Learn More →
      </span>
    </Link>
  </motion.div>
);