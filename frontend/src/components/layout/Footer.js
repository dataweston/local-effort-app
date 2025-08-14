import React from 'react';

export const Footer = () => {
  return (
    <footer className="p-8 mt-16 border-t border-gray-900 font-mono text-sm">
      <div className="flex justify-between">
        <div>
            <p>&copy; {new Date().getFullYear()} Local Effort</p>
            <p className="text-gray-600">Roseville, MN | Midwest</p>
        </div>
        <div className="flex space-x-4">
          <a href="https://instagram.com/localeffort" className="underline">Instagram</a>
          <a href="https://facebook.com/localeffort" className="underline">Facebook</a>
          <a href="https://www.thumbtack.com/mn/saint-paul/personal-chefs/weston-smith/service/429294230165643268" className="underline">Thumbtack</a>
        </div>
      </div>
    </footer>
  );
};