import React, { useEffect, useRef, useState } from 'react';

const FuzzyText = ({
  text = '',
  className = '',
  duration = 50,
  iterations = 1,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
  onAnimationComplete,
  ...props
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const iterationRef = useRef(0);
  const intervalRef = useRef(null);

  const getRandomChar = () => {
    return characters[Math.floor(Math.random() * characters.length)];
  };

  const animateFuzzy = () => {
    setIsAnimating(true);
    let currentIteration = 0;
    const textLength = text.length;
    let currentIndex = 0;

    const animate = () => {
      if (currentIteration >= iterations) {
        setDisplayText(text);
        setIsAnimating(false);
        if (onAnimationComplete) {
          onAnimationComplete();
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        return;
      }

      if (currentIndex >= textLength) {
        currentIndex = 0;
        currentIteration++;
      }

      const newText = text
        .split('')
        .map((char, index) => {
          if (index < currentIndex) {
            return char;
          } else if (index === currentIndex) {
            return getRandomChar();
          } else {
            return getRandomChar();
          }
        })
        .join('');

      setDisplayText(newText);
      currentIndex++;
    };

    intervalRef.current = setInterval(animate, duration);
  };

  useEffect(() => {
    animateFuzzy();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text]);

  return (
    <span className={className} {...props}>
      {displayText}
    </span>
  );
};

export { FuzzyText };
