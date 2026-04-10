"use client";

import { cn } from "@flixlix-cards/cn";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMediaQuery } from "../hooks/use-media-query";

interface LinkPreviewContextType {
  isHovering: boolean;
  setIsHovering: (hovering: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  cursorPosition: { x: number; y: number };
  setCursorPosition: (position: { x: number; y: number }) => void;
}

const LinkPreviewContext = createContext<LinkPreviewContextType | null>(null);

const useLinkPreview = (): LinkPreviewContextType => {
  const context = useContext(LinkPreviewContext);
  if (!context) {
    throw new Error("useLinkPreview must be used within a LinkPreview component");
  }
  return context;
};

interface LinkPreviewProps {
  children: ReactNode;
}

export const LinkPreview = ({ children }: LinkPreviewProps) => {
  const [isHovering, setIsHovering] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLElement>(null);

  return (
    <LinkPreviewContext.Provider
      value={{
        isHovering,
        setIsHovering,
        triggerRef,
        cursorPosition,
        setCursorPosition,
      }}
    >
      <div className="relative">{children}</div>
    </LinkPreviewContext.Provider>
  );
};

interface LinkPreviewTriggerProps {
  children: ReactNode;
  className?: string;
}

export const LinkPreviewTrigger = ({ children, className }: LinkPreviewTriggerProps) => {
  const { triggerRef, setIsHovering, setCursorPosition } = useLinkPreview();

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCursorPosition({ x, y });
    }
  };

  return (
    <span
      ref={triggerRef}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {children}
    </span>
  );
};

interface LinkPreviewContentProps {
  children: ReactNode;
  className?: string;
  offset?: { x: number; y: number };
}

export const LinkPreviewContent = ({ children, className }: LinkPreviewContentProps) => {
  const { isHovering, triggerRef, cursorPosition } = useLinkPreview();
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [triggerSize, setTriggerSize] = useState({ width: 0, height: 0 });
  const isWideEnough = useMediaQuery("(min-width: 1024px)");
  const motionCursorX = useMotionValue(0);
  const motionCursorY = useMotionValue(0);

  useEffect(() => {
    if (!isHovering || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        x: rect.right + 24,
        y: rect.top + rect.height / 2,
      });
      setTriggerSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isHovering, triggerRef]);

  useEffect(() => {
    motionCursorX.set(cursorPosition.x);
    motionCursorY.set(cursorPosition.y);
  }, [cursorPosition.x, cursorPosition.y, motionCursorX, motionCursorY]);

  const offsetX = useTransform(motionCursorX, [0, triggerSize.width || 1], [-8, 8]);
  const offsetY = useTransform(motionCursorY, [0, triggerSize.height || 1], [-8, 8]);

  const springX = useSpring(offsetX, { bounce: 0 });
  const springY = useSpring(offsetY, { bounce: 0 });

  if (!isWideEnough) return;
  return (
    <AnimatePresence>
      {isHovering && (
        <motion.div
          ref={contentRef}
          className={cn("pointer-events-none fixed z-50 origin-left -translate-y-1/2", className)}
          style={{ left: position.x, top: position.y, x: springX, y: springY }}
          initial={{
            opacity: 0,
            scale: 0.8,
            filter: "blur(10px)",
          }}
          animate={{
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
          }}
          exit={{
            opacity: 0,
            scale: 0.8,
            filter: "blur(10px)",
          }}
          transition={{ type: "spring", bounce: 0 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
