'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const FaucetFlow = () => {
    const [progress, setProgress] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => (prev >= 100 ? 0 : prev + 0.5));
        }, 20);
        return () => clearInterval(timer);
    }, []);

    const nodes = [
        { id: 1, title: 'Create a faucet', x: isMobile ? 200 : 150, y: isMobile ? 100 : 80, color: '#f97316', icon: '/favicon.png'  },
        { id: 2, title: 'Choose a distribution type', x: isMobile ? 200 : 550, y: isMobile ? 250 : 180, color: '#10b981', icon: '/favicon.png' },
        { id: 3, title: 'Add tasks, quests or quizzes', x: isMobile ? 200 : 150, y: isMobile ? 400 : 280, color: '#ef4444', icon: '/favicon.png' },
        { id: 4, title: 'Fund your faucet', x: isMobile ? 200 : 550, y: isMobile ? 550 : 380, color: '#f59e0b', icon: '/favicon.png' },
        { id: 5, title: 'Share your compaign link', x: isMobile ? 200 : 150, y: isMobile ? 700 : 480, color: '#8b5cf6', icon: '/favicon.png' },
        { id: 6, title: 'Users participate -> Qualify -> Drip', x: isMobile ? 200 : 550, y: isMobile ? 850 : 580, color: '#ec4899', icon: '/favicon.png' }
    ];

    // Create path segments with angular bends
    const createPathSegments = () => {
        const segments = [];

        for (let i = 0; i < nodes.length - 1; i++) {
            const from = nodes[i];
            const to = nodes[i + 1];

            // Exit point from current node (right side)
            const startX = from.x + (isMobile ? 0 : 60);
            const startY = from.y + (isMobile ? 60 : 0);

            // Entry point to next node (left side)
            const endX = to.x + (isMobile ? 0 : -60);
            const endY = to.y + (isMobile ? -60 : 0);

            if (isMobile) {
                // Vertical path for mobile
                segments.push({
                    points: [
                        { x: startX, y: startY },
                        { x: startX, y: endY },
                        { x: endX, y: endY },
                        { x: endX, y: endY }
                    ]
                });
            } else {
                // Original horizontal path for desktop
                const midX = (startX + endX) / 2;
                segments.push({
                    points: [
                        { x: startX, y: startY },
                        { x: midX, y: startY },
                        { x: midX, y: endY },
                        { x: endX, y: endY }
                    ]
                });
            }
        }

        return segments;
    };

    const pathSegments = createPathSegments();

    // Calculate total path length
    const calculateSegmentLength = (points: { x: number; y: number }[]) => {
        let length = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    };

    const totalLength = pathSegments.reduce((sum, seg) => sum + calculateSegmentLength(seg.points), 0);

    // Get point along path at progress percentage
    const getPointAtProgress = (currentProgress: number) => {
        let accumulatedLength = 0;
        const targetLength = (currentProgress / 100) * totalLength;

        for (let segIndex = 0; segIndex < pathSegments.length; segIndex++) {
            const segment = pathSegments[segIndex];
            const segmentLength = calculateSegmentLength(segment.points);

            if (accumulatedLength + segmentLength >= targetLength) {
                const segmentProgress = targetLength - accumulatedLength;

                // Find which sub-segment within this segment
                let subAccum = 0;
                for (let i = 0; i < segment.points.length - 1; i++) {
                    const p1 = segment.points[i];
                    const p2 = segment.points[i + 1];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const subLength = Math.sqrt(dx * dx + dy * dy);

                    if (subAccum + subLength >= segmentProgress) {
                        const t = (segmentProgress - subAccum) / subLength;
                        return {
                            x: p1.x + dx * t,
                            y: p1.y + dy * t
                        };
                    }
                    subAccum += subLength;
                }
            }
            accumulatedLength += segmentLength;
        }

        return pathSegments[pathSegments.length - 1].points[3];
    };

    const currentPoint = getPointAtProgress(progress);

    const svgWidth = isMobile ? 400 : 800;
    const svgHeight = isMobile ? 1000 : 700;

    return (
        <div className="w-full min-h-screen p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="flex gap-4 md:gap-12 items-center justify-center mb-4 md:mb-0"
                >
                    <h1 className="flex items-center justify-center gap-1 text-3xl md:text-5xl text-white font-extrabold">Get Started</h1>
                </motion.div>

                <div className="overflow-x-auto">
                    <svg width={svgWidth} height={svgHeight} className="mx-auto" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="50%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>

                            <filter id="glow">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Draw all path segments */}
                        {pathSegments.map((segment, index) => {
                            const pathD = `M ${segment.points[0].x} ${segment.points[0].y} 
                              L ${segment.points[1].x} ${segment.points[1].y}
                              L ${segment.points[2].x} ${segment.points[2].y}
                              L ${segment.points[3].x} ${segment.points[3].y}`;

                            return (
                                <g key={`segment-${index}`}>
                                    {/* Background path */}
                                    <path
                                        d={pathD}
                                        fill="none"
                                        stroke="#334155"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </g>
                            );
                        })}

                        {/* Animated progress path */}
                        {pathSegments.map((segment, index) => {
                            const pathD = `M ${segment.points[0].x} ${segment.points[0].y} 
                              L ${segment.points[1].x} ${segment.points[1].y}
                              L ${segment.points[2].x} ${segment.points[2].y}
                              L ${segment.points[3].x} ${segment.points[3].y}`;

                            const segmentStart = pathSegments.slice(0, index).reduce((sum, seg) =>
                                sum + calculateSegmentLength(seg.points), 0) / totalLength * 100;
                            const segmentEnd = pathSegments.slice(0, index + 1).reduce((sum, seg) =>
                                sum + calculateSegmentLength(seg.points), 0) / totalLength * 100;

                            if (progress > segmentStart) {
                                return (
                                    <path
                                        key={`animated-${index}`}
                                        d={pathD}
                                        fill="none"
                                        stroke="url(#lineGradient)"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        filter="url(#glow)"
                                        opacity={progress >= segmentEnd ? 1 : 0.7}
                                    />
                                );
                            }
                            return null;
                        })}

                        {/* Animated dot */}
                        {progress > 0 && progress < 100 && (
                            <g>
                                <circle
                                    cx={currentPoint.x}
                                    cy={currentPoint.y}
                                    r="8"
                                    fill="#fff"
                                    filter="url(#glow)"
                                >
                                    <animate
                                        attributeName="r"
                                        values="6;10;6"
                                        dur="1s"
                                        repeatCount="indefinite"
                                    />
                                </circle>
                            </g>
                        )}

                        {/* Draw nodes */}
                        {nodes.map((node) => (
                            <g key={node.id}>
                                {/* Node square with shadow */}
                                <rect
                                    x={node.x - 55}
                                    y={node.y - 55}
                                    width="110"
                                    height="110"
                                    rx="12"
                                    fill="#1e293b"
                                    stroke="#475569"
                                    strokeWidth="3"
                                    filter="url(#glow)"
                                />

                                {/* Inner colored square (logo placeholder) */}
                                <rect
                                    x={node.x - 40}
                                    y={node.y - 40}
                                    width="90"
                                    height="90"
                                    rx="8"
                                    fill="transparent"
                                    opacity="0.9"
                                />

                                {/* Icon */}
                                <foreignObject
                                    x={node.x - 20} 
                                    y={node.y - 20} 
                                    width="40" 
                                    height="40"
                                >
                                    <div className="flex items-center justify-center w-full h-full">
                                        <Image 
                                            src={node.icon} 
                                            alt="Step icon" 
                                            width={50} 
                                            height={50}
                                            className="object-contain"
                                        />
                                    </div>
                                </foreignObject>

                                {/* Title below node */}
                                <text
                                    x={node.x}
                                    y={node.y + 85}
                                    textAnchor="middle"
                                    fontSize={isMobile ? "14" : "20"}
                                    fontWeight="600"
                                    fill="#e2e8f0"
                                >
                                    {node.title}
                                </text>
                            </g>
                        ))}
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default FaucetFlow;