import React from 'react';

export const Footer = () => {
  return (
    <footer className="mt-16 border-t border-neutral-200">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8 font-mono text-sm text-neutral-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Local Effort Food Co.</p>
            <p className="text-neutral-600">Roseville, MN</p>
            <p className="text-neutral-600">
              <a href="mailto:yum@localeffortfood.com" className="hover:underline">yum@localeffortfood.com</a>
            </p>
            <p className="mt-2 text-neutral-600">
              Service Areas:
              {' '}
              <a href="/personal-chef-minneapolis" className="underline underline-offset-4 hover:opacity-80">Minneapolis</a>
              {' '}|{' '}
              <a href="/personal-chef-st-paul" className="underline underline-offset-4 hover:opacity-80">St. Paul</a>
              {' '}|{' '}
              <a href="/personal-chef-twin-cities" className="underline underline-offset-4 hover:opacity-80">Twin Cities</a>
              {' '}|{' '}
              <a href="/personal-chef-minnesota" className="underline underline-offset-4 hover:opacity-80">Minnesota</a>
              {' '}|{' '}
              <a href="/personal-chef-wisconsin" className="underline underline-offset-4 hover:opacity-80">Wisconsin</a>
            </p>
            <p className="text-neutral-500 text-xs mt-2">&copy; {new Date().getFullYear()} Local Effort</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-4">
              <a href="/services" className="underline underline-offset-4 hover:opacity-80">Services</a>
              <a href="/menu" className="underline underline-offset-4 hover:opacity-80">Menus</a>
              <a href="/about" className="underline underline-offset-4 hover:opacity-80">About</a>
              <a href="/releases" className="underline underline-offset-4 hover:opacity-80">Press</a>
            </div>
            <div className="flex gap-4">
              <a href="https://www.tiktok.com/@localeffort" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:opacity-80">TikTok</a>
              <a href="https://instagram.com/localeffort" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:opacity-80">Instagram</a>
              <a href="https://facebook.com/localeffort" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:opacity-80">Facebook</a>
              <a href="https://www.thumbtack.com/mn/saint-paul/personal-chefs/weston-smith/service/429294230165643268" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:opacity-80">Thumbtack</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
