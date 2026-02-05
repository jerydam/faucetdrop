'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

type AnimationType = 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'zoomIn';

interface AnimateOnScrollProps {
  children: ReactNode;
  type?: AnimationType;
  delay?: number;
  threshold?: number;
  className?: string;
}

const animationClasses: Record<AnimationType, string> = {
  fadeIn: 'opacity-0 transition-all duration-700 ease-out',
  slideUp: 'opacity-0 translate-y-10 transition-all duration-700 ease-out',
  slideLeft: 'opacity-0 translate-x-10 transition-all duration-700 ease-out',
  slideRight: 'opacity-0 -translate-x-10 transition-all duration-700 ease-out',
  zoomIn: 'opacity-0 scale-95 transition-all duration-700 ease-out',
};

const visibleClasses = 'opacity-100 translate-y-0 translate-x-0 scale-100';

export default function AnimateOnScroll({
  children,
  type = 'fadeIn',
  delay = 0,
  threshold = 0.1,
  className = '',
}: AnimateOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
  
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: threshold,
      }
    );
  
    observer.observe(element);
  
    return () => {
      observer.unobserve(element);
    };
  }, [delay, threshold]);

  const baseClasses = animationClasses[type];
  const combinedClasses = `${baseClasses} ${isVisible ? visibleClasses : ''} ${className}`.trim();

  return (
    <div ref={elementRef} className={combinedClasses} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
