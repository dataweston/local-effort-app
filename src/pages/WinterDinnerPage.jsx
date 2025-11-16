import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DinnerRegistrationModal from '../components/WinterDinner/DinnerRegistrationModal';

const WinterDinnerPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/images/sprite_flicker.gif"
          alt="Winter Dinner Background"
          className="w-[80%] h-auto object-contain"
          style={{ imageRendering: 'crisp-edges' }}
        />
      </div>

      {/* Call to Action Button */}
      <motion.button
        onClick={() => setIsModalOpen(true)}
        className="relative z-10 px-12 py-6 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-lg text-white text-2xl font-light tracking-wider hover:bg-white/20 transition-all duration-300 shadow-2xl"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        Attend Dinner
      </motion.button>

      {/* Registration Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <DinnerRegistrationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default WinterDinnerPage;
