"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";

export function DynamicBackground() {
    const [isMounted, setIsMounted] = useState(false);

    // Raw mouse coordinates (normalized 0 to 100%)
    const mouseX = useMotionValue(50);
    const mouseY = useMotionValue(50);

    // Smooth springs for fluid, slightly delayed movement
    const springX = useSpring(mouseX, { damping: 40, stiffness: 100, mass: 0.8 });
    const springY = useSpring(mouseY, { damping: 40, stiffness: 100, mass: 0.8 });

    // Creates a much more prominent, soft white spotlight tracking the mouse 
    // against a slightly darker beige background. We use px instead of % for the size 
    // to keep the spotlight perfectly circular and sized regardless of screen ratio.
    const background = useMotionTemplate`radial-gradient(1000px circle at ${springX}% ${springY}%, rgba(255, 255, 255, 0.9) 0%, rgba(246, 240, 234, 1) 40%, rgba(235, 228, 220, 1) 100%)`;

    useEffect(() => {
        setIsMounted(true);

        const handleMouseMove = (e: MouseEvent) => {
            // Convert raw pixels to 0-100% of the viewport window
            const xPct = (e.clientX / window.innerWidth) * 100;
            const yPct = (e.clientY / window.innerHeight) * 100;
            mouseX.set(xPct);
            mouseY.set(yPct);
        };

        window.addEventListener("mousemove", handleMouseMove, { passive: true });
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    // Server-side / fallback state to prevent hydration errors 
    if (!isMounted) {
        return (
            <div
                className="pointer-events-none fixed inset-0 -z-10"
                style={{
                    background: "radial-gradient(1000px circle at 50% 50%, rgba(255, 255, 255, 0.9) 0%, rgba(246, 240, 234, 1) 40%, rgba(235, 228, 220, 1) 100%)"
                }}
            />
        );
    }

    // Client-side animated version
    return (
        <motion.div
            className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-1000"
            style={{ background }}
        />
    );
}
