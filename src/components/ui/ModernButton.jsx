// src/components/ui/ModernButton.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

export const ModernButton = ({
  as: Component = 'button',
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  onClick,
  className = '',
  disabled = false,
  href,
  target,
  rel,
  ...props
}) => {
  const baseClasses = 'btn optimize-rendering';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const Tag = motion(Component);
  const motionProps = Component === 'button' ? { disabled } : {};
  return (
    <Tag
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      href={Component === 'a' ? href : undefined}
      target={Component === 'a' ? target : undefined}
      rel={Component === 'a' ? rel : undefined}
      {...motionProps}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </Tag>
  );
};

ModernButton.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  icon: PropTypes.node,
  as: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  onClick: PropTypes.func,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  href: PropTypes.string,
  target: PropTypes.string,
  rel: PropTypes.string,
};

ModernButton.defaultProps = {
  variant: 'primary',
  size: 'md',
  icon: null,
  className: '',
  disabled: false,
};

export default ModernButton;
