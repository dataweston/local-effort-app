// src/pages/MenuPage.js
import React, { useState } from "react";
import { sampleMenus } from "../data/sampleMenus";
import { motion } from "framer-motion";

// Simple ServiceCard replacement
const ServiceCard = ({ title, description, children }) => (
  <motion.div
    className="group rounded-xl bg-neutral-50 p-8 shadow-sm ring-1 ring-neutral-200 transition-shadow hover:shadow-md"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <h4 className="text-2xl font-bold uppercase tracking-tight">{title}</h4>
    <p className="font-mono text-neutral-600 min-h-[2rem] mt-2">{description}</p>
    <div className="mt-4">{children}</div>
  </motion.div>
);

export default function MenuPage() {
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (id) => setOpenMenu(openMenu === id ? null : id);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Our Menus</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleMenus.map((menu) => {
          const isOpen = openMenu === menu.id;

          return (
            <ServiceCard
              key={menu.id}
              title={menu.title}
              description={menu.description || ""}
            >
              <button
                onClick={() => toggleMenu(menu.id)}
                className="mt-2 text-sm font-medium text-blue-600 hover:underline"
              >
                {isOpen ? "Hide Sections ▲" : "Show Sections ▼"}
              </button>

              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-4"
              >
                {isOpen &&
                  menu.sections.map((section, idx) => (
                    <div key={idx} className="mt-4">
                      <h5 className="text-lg font-semibold">{section.course}</h5>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {section.items.map((item, i) => (
                          <li key={i}>
                            <span className="font-medium">{item.name}</span>
                            {item.note && (
                              <span className="text-gray-600 italic">
                                {" — "}{item.note}
                              </span>
                            )}
                            {item.dietary?.length > 0 && (
                              <span className="ml-2 text-sm text-green-600">
                                [{item.dietary.join(", ")}]
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </motion.div>
            </ServiceCard>
          );
        })}
      </div>
    </div>
  );
}
