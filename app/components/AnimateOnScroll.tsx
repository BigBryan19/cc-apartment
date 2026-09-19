
"use client";

import React, { useEffect, useRef } from "react";
import { motion, useInView, useAnimation } from "framer-motion";

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const AnimateOnScroll: React.FC<Props> = ({
  children,
  className = "",
  delay = 0,
}) => {
  const ref = useRef(null);
  // Trigger animation when the element is 100px from the bottom of the viewport
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0 },
      }}
      initial="hidden"
      animate={controls}
      transition={{ duration: 0.7, delay: delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default AnimateOnScroll;
