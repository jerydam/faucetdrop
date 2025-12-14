'use client'
import Image from 'next/image';
import React, { useState, useRef, useEffect } from 'react';

const KnowFaucetDrops = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 mb-12 text-center">
      <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-[-0.015em] px-4 py-5 text-center text-white">
        Why FaucetDrops?
      </h1>
      <div className="mb-8">
        <ul className="text-gray-300 mb-8 grid grid-cols-1 md:grid-cols-2 gap-3 text-xl px-10">
          <li className="flex items-center justify-center gap-2 bg-[#0052FF]/20 ring-1 ring-gray-700 rounded-xl p-2">
            <span>Web3 teams want to grow</span>
          </li>
          <li className="flex items-center justify-center gap-2 bg-[#0052FF]/20 ring-1 ring-gray-700 rounded-xl p-2">
            <span>Users want engagement</span>
          </li>
          <li className="flex items-center justify-center gap-2 md:col-span-2 bg-[#0052FF]/20 ring-1 ring-gray-700 rounded-xl p-2">
            <span>But the current tools are fragmented, expensive and complicated</span>
          </li>
        </ul>
      </div>
      <div className="relative inline-block">
        <p className="text-xl md:text-2xl font-medium text-white relative z-10 px-6 py-3">
          FaucetDrops Unifies Everything...
        </p>
        <div className="absolute inset-0 bg-linear-to-r from-cyan-500/20 to-green-500/20 rounded-full blur-md"></div>
      </div>
    </div>
  );
};

const WhyFaucetDrops = () => {
  const [logoPos, setLogoPos] = useState({ x: 450, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const lastPos = useRef({ x: 450, y: 150 });

  const initialItems = [
    { id: 1, text: 'Token Distribution' },
    { id: 2, text: 'Quests' },
    { id: 3, text: 'Campaigns' },
    { id: 4, text: 'Quizzes' },
    { id: 5, text: 'Competition' },
    { id: 6, text: 'Automation' },
    { id: 7, text: 'Gasless' },
    { id: 8, text: 'Fast' },
    { id: 9, text: 'Frictionless' },
    { id: 10, text: 'Stablecoins' },
    { id: 11, text: 'Sybil Resistant' },
  ];

  const [items, setItems] = useState(() =>
    initialItems.map(item => ({
      ...item,
      x: Math.random() * 800 + 50,
      y: Math.random() * 300 + 50,
      vx: 0,
      vy: 0,
      rotation: Math.random() * 360
    }))
  );

  useEffect(() => {
    const container = document.querySelector('.why-faucet-drops-container');
    if (!container) return;

    const updateItems = () => {
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      setItems(prevItems => prevItems.map(item => {
        let newX = item.x + item.vx;
        let newY = item.y + item.vy;
        let newVx = item.vx * 0.98;
        let newVy = item.vy * 0.98;
        const newRotation = item.rotation + item.vx * 2;

        // Bounce off container walls
        const padding = 20; // Padding from container edges
        const itemWidth = 100; // Approximate width of the item
        const itemHeight = 40; // Approximate height of the item

        if (newX < padding) {
          newX = padding;
          newVx = Math.abs(newVx) * 0.7;
        }
        if (newX > containerWidth - itemWidth - padding) {
          newX = containerWidth - itemWidth - padding;
          newVx = -Math.abs(newVx) * 0.7;
        }
        if (newY < padding) {
          newY = padding;
          newVy = Math.abs(newVy) * 0.7;
        }
        if (newY > containerHeight - itemHeight - padding) {
          newY = containerHeight - itemHeight - padding;
          newVy = -Math.abs(newVy) * 0.7;
        }

        return {
          ...item,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          rotation: newRotation
        };
      }));
    };

    const animationFrame = setInterval(updateItems, 16);

    return () => clearInterval(animationFrame);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        const dx = newX - lastPos.current.x;
        const dy = newY - lastPos.current.y;

        lastPos.current = { x: newX, y: newY };
        setLogoPos({ x: newX, y: newY });

        setItems(prevItems => prevItems.map(item => {
          const itemDx = newX - item.x;
          const itemDy = newY - item.y;
          const distance = Math.sqrt(itemDx * itemDx + itemDy * itemDy);

          const hitRadius = 100;
          if (distance < hitRadius && distance > 0) {
            const force = (hitRadius - distance) / hitRadius;
            const angle = Math.atan2(itemDy, itemDx);
            const pushForce = force * 15;

            const kickVx = -Math.cos(angle) * pushForce + dx * 0.5;
            const kickVy = -Math.sin(angle) * pushForce + dy * 0.5;

            return {
              ...item,
              vx: item.vx + kickVx,
              vy: item.vy + kickVy
            };
          }

          return item;
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - logoPos.x,
      y: e.clientY - logoPos.y
    });
    lastPos.current = { x: logoPos.x, y: logoPos.y };
  };

  return (
    <div className="flex flex-col justify-center items-center w-full py-12 pt-50 text-white">
      <KnowFaucetDrops />
      <div className="why-faucet-drops-container relative w-full max-w-4xl h-[400px] bg-[#020817]/20 rounded-xl overflow-hidden border border-gray-700">
        {items.map(item => (
          <div
            key={item.id}
            className="absolute text-white px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap"
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              transform: `rotate(${item.rotation}deg)`,
              background: 'rgba(2, 8, 23, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid #0052FF',
            }}
          >
            {item.text}
          </div>
        ))}

        <div
          className="absolute cursor-grab active:cursor-grabbing z-10"
          style={{
            left: `${logoPos.x}px`,
            top: `${logoPos.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-linear-to-br from-[#0052FF]/20 to-[#0052FF] rounded-full blur-xl opacity-50"></div>
            <div className="relative w-20 h-20 flex items-center justify-center">
              <Image
                src="/faucet-drag.png"
                alt="FaucetDrop Logo"
                width={1000}
                height={1000}
                className="w-20 h-20 object-contain rounded-full"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhyFaucetDrops;