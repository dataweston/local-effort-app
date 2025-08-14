// src/components/ui/ModernButton.jsx
import React from 'react';
import { motion } from 'framer-motion';

export const ModernButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon = null, 
  onClick, 
  className = '',
  disabled = false,
  ...props 
}) => {
  const baseClasses = 'btn optimize-rendering';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <motion.button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </motion.button>
  );
};

// src/components/ui/index.js - Barrel export file
export { ModernButton } from './ModernButton';
export { ModernCard } from './ModernCard';
export { AnimatedCounter } from './AnimatedCounter';
// ... export other UI components