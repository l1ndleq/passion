"use client";

import { motion } from "framer-motion";

const ITEMS = [
    "✦ ЧИСТЫЕ ФОРМУЛЫ",
    "✦ ВЕГАНСКИЙ СОСТАВ",
    "✦ МЯГКИЕ ТЕКСТУРЫ",
    "✦ CRUELTY-FREE",
    "✦ ЕЖЕДНЕВНЫЙ УХОД",
    "✦ БЕЗ ПАРАБЕНОВ",
    "✦ СИЯНИЕ И ЗДОРОВЬЕ",
];

export function InfiniteMarquee() {
    // We duplicate the items a few times so they can scroll seamlessly
    const content = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS];

    return (
        <div className="flex w-full overflow-hidden border-y border-black/5 bg-black/[0.02] py-4">
            <motion.div
                className="flex whitespace-nowrap"
                animate={{
                    x: ["0%", "-50%"],
                }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 35, // Adjust speed by changing duration
                }}
            >
                {content.map((item, index) => (
                    <span
                        key={index}
                        className="mx-6 text-[10px] tracking-[0.2em] uppercase text-black/60"
                    >
                        {item}
                    </span>
                ))}
            </motion.div>
        </div>
    );
}
