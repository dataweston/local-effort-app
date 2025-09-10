import React from 'react';

export const Footer = () => {
  return (
    <footer className="mt-16 border-t border-neutral-200">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8 font-mono text-sm text-neutral-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p>&copy; {new Date().getFullYear()} Local Effort</p>
            <p className="text-neutral-500">Roseville, MN · Midwest</p>
          </div>
          <div className="flex gap-4">
            <a
              href="https://instagram.com/localeffort"
              className="underline underline-offset-4 hover:opacity-80"
            >
              Instagram
            </a>
            <a
              href="https://facebook.com/localeffort"
              className="underline underline-offset-4 hover:opacity-80"
            >
              Facebook
            </a>
            <a
              href="https://www.thumbtack.com/mn/saint-paul/personal-chefs/weston-smith/service/429294230165643268"
              className="underline underline-offset-4 hover:opacity-80"
            >
              Thumbtack
            </a>
            {/* Partner Portal link removed */}
          </div>
        </div>
      </div>
    </footer>
  );
};
