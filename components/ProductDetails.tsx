"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Section = {
  title: string;
  content: string;
};

export default function ProductDetails({
  sections,
}: {
  sections: Section[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mt-10 border-t border-black/10">
      {sections.map((section, i) => {
        const isOpen = openIndex === i;

        return (
          <div key={i} className="border-b border-black/10">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between py-5 text-left text-sm tracking-wide uppercase"
            >
              <span>{section.title}</span>
              <span
                className={`transition-transform duration-300 ${isOpen ? "rotate-45" : ""
                  }`}
              >
                +
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                >
                  <div className="pb-5">
                    <p className="text-sm leading-relaxed text-black/70">
                      {section.content}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
