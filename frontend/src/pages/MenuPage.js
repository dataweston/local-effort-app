// src/pages/MenuPage.js
import React, { useState } from "react";
import { sampleMenus } from "../data/sampleMenus";
import ServiceCard from "../components/common/ServiceCard";
import { motion } from "framer-motion";

export default function MenuPage() {
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (id) => {
    setOpenMenu(openMenu === id ? null : id);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Our Menus</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleMenus.map((menu, index) => {
          const menuId = menu.id ?? index; // use menu.id if it exists, otherwise index
          const isOpen = openMenu === menuId;

          return (
            <ServiceCard
              key={menuId}
              title={menu.title}
              description={menu.subtitle || menu.description || ""}
              to="#"
            >
              <button
                onClick={() => toggleMenu(menuId)}
                className="mt-2 text-sm font-medium text-blue-600 hover:underline"
              >
                {isOpen ? "Hide Sections ▲" : "Show Sections ▼"}
              </button>

              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-2"
              >
                {menu.sections.map((section, idx) => (
                  <div key={idx} className="mt-4">
                    <h5 className="text-lg font-semibold">{section.course}</h5>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {section.items.map((item, i) => (
                        <li key={i}>
                          <span className="font-medium">{item.name}</span>
                          {item.note && (
                            <span className="text-gray-600 italic"> — {item.note}</span>
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
