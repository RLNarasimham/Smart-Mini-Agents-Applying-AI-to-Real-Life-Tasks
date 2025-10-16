import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface AnimatedSphereProps {
  voiceMode?: boolean;
  audioLevel?: number;
  size?: 'small' | 'medium' | 'large';
}

export const AnimatedSphere: React.FC<AnimatedSphereProps> = ({ 
  voiceMode = false, 
  audioLevel = 0,
  size = 'large'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [targetRotation, setTargetRotation] = useState({ x: 0, y: 0, z: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Size configurations
  const sizeConfig = {
    small: { canvas: 300, radius: 70, particles: 30 },
    medium: { canvas: 400, radius: 100, particles: 40 },
    large: { canvas: 500, radius: 120, particles: 50 }
  };

  const config = sizeConfig[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = config.canvas * dpr;
    canvas.height = config.canvas * dpr;
    canvas.style.width = `${config.canvas}px`;
    canvas.style.height = `${config.canvas}px`;
    ctx.scale(dpr, dpr);

    let time = 0;

    // Neural network node class
    class NeuralNode {
      x: number;
      y: number;
      z: number;
      originalX: number;
      originalY: number;
      originalZ: number;
      
      constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.originalX = x;
        this.originalY = y;
        this.originalZ = z;
      }

      project(centerX: number, centerY: number, scale: number) {
        return {
          x: centerX + this.x * scale,
          y: centerY + this.y * scale,
          z: this.z
        };
      }
    }

    // Create nodes on a perfect sphere
    const nodes: NeuralNode[] = [];
    const numNodes = 80; // More nodes for better sphere coverage
    
    // Fibonacci sphere algorithm for even distribution
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
    
    for (let i = 0; i < numNodes; i++) {
      const y = 1 - (i / (numNodes - 1)) * 2; // y goes from 1 to -1
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      
      nodes.push(new NeuralNode(x, y, z));
    }

    // Create connections between nearby nodes
    const connections: Array<[number, number]> = [];
    const maxDistance = 0.5; // Maximum distance for connections
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].originalX - nodes[j].originalX;
        const dy = nodes[i].originalY - nodes[j].originalY;
        const dz = nodes[i].originalZ - nodes[j].originalZ;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < maxDistance) {
          connections.push([i, j]);
        }
      }
    }

    const drawSphere = () => {
      ctx.clearRect(0, 0, config.canvas, config.canvas);
      
      const centerX = config.canvas / 2;
      const centerY = config.canvas / 2;
      const baseRadius = voiceMode ? config.radius + audioLevel * 30 : config.radius;
      
      // Smooth interpolation between current and target rotation
      const lerpFactor = 0.1;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      
      // Apply velocity and friction when not dragging
      if (!isDragging && !voiceMode) {
        const friction = 0.95;
        const newVelocity = {
          x: velocity.x * friction,
          y: velocity.y * friction
        };
        setVelocity(newVelocity);
        
        // Apply velocity to target rotation
        setTargetRotation(prev => ({
          x: prev.x + newVelocity.x * deltaTime * 0.001,
          y: prev.y + newVelocity.y * deltaTime * 0.001,
          z: prev.z
        }));
      }
      
      // Interpolate current rotation towards target
      setRotation(prev => ({
        x: prev.x + (targetRotation.x - prev.x) * lerpFactor,
        y: prev.y + (targetRotation.y - prev.y) * lerpFactor,
        z: prev.z + (targetRotation.z - prev.z) * lerpFactor
      }));
      
      // Automatic slow rotation when not interacting
      const autoRotX = Math.sin(time * 0.0005) * 0.05;
      const autoRotY = time * 0.0003;
      
      // Calculate final rotation based on mode
      let rotX, rotY, rotZ;
      
      if (voiceMode) {
        rotX = Math.sin(time * 0.001) * 0.2;
        rotY = time * 0.0005;
        rotZ = 0;
      } else if (isDragging || isHovering) {
        rotX = rotation.x;
        rotY = rotation.y;
        rotZ = rotation.z;
      } else {
        // Blend automatic rotation with current rotation
        rotX = rotation.x + autoRotX * 0.1;
        rotY = rotation.y + autoRotY * 0.1;
        rotZ = rotation.z;
      }

      // Rotate and project nodes with proper 3D rotation
      const projectedNodes = nodes.map((node, i) => {
        let x = node.originalX;
        let y = node.originalY;
        let z = node.originalZ;

        // Apply 3D rotation in proper order: Z, Y, X
        // Rotate around Z axis
        let tempX = x * Math.cos(rotZ) - y * Math.sin(rotZ);
        let tempY = x * Math.sin(rotZ) + y * Math.cos(rotZ);
        x = tempX;
        y = tempY;

        // Rotate around Y axis
        tempX = x * Math.cos(rotY) - z * Math.sin(rotY);
        let tempZ = x * Math.sin(rotY) + z * Math.cos(rotY);
        x = tempX;
        z = tempZ;

        // Rotate around X axis
        tempY = y * Math.cos(rotX) - z * Math.sin(rotX);
        tempZ = y * Math.sin(rotX) + z * Math.cos(rotX);
        y = tempY;
        z = tempZ;

        // Add subtle wave effect
        const waveOffset = Math.sin(time * 0.002 + i * 0.1) * 0.05;
        const scale = Math.max(1, baseRadius * (1 + waveOffset));

        // Add audio reactivity - ensure it's always a valid positive number
        const safeAudioLevel = Math.max(0, Math.min(1, audioLevel || 0));
        const audioReactivity = voiceMode ? Math.abs(Math.sin(time * 0.005 + i * 0.2)) * safeAudioLevel * 0.3 : 0;
        
        return {
          x: centerX + x * scale,
          y: centerY + y * scale,
          z: z,
          depth: z,
          audioReactivity
        };
      });

      // Sort by depth (z-axis) for proper rendering
      const sortedIndices = projectedNodes
        .map((_, index) => index)
        .sort((a, b) => projectedNodes[a].depth - projectedNodes[b].depth);

      // Hover highlight effect
      const highlightIntensity = isHovering ? 1.3 : 1;

      // Draw connections (neural network synapses)
      connections.forEach(([i, j]) => {
        const node1 = projectedNodes[i];
        const node2 = projectedNodes[j];
        
        // Only draw connections where both nodes are visible
        if (node1.depth > -0.5 && node2.depth > -0.5) {
          const avgDepth = (node1.depth + node2.depth) / 2;
          const opacity = Math.max(0.1, (avgDepth + 1) * 0.3) * highlightIntensity;
          
          // Dynamic color based on time and position
          const hue = (time * 0.1 + i * 10) % 60 + 240; // Purple to blue range
          const gradient = ctx.createLinearGradient(node1.x, node1.y, node2.x, node2.y);
          gradient.addColorStop(0, `hsla(${hue}, 80%, ${65 + (isHovering ? 10 : 0)}%, ${opacity * 0.4})`);
          gradient.addColorStop(0.5, `hsla(${hue + 20}, 75%, ${60 + (isHovering ? 10 : 0)}%, ${opacity * 0.6})`);
          gradient.addColorStop(1, `hsla(${hue}, 80%, ${65 + (isHovering ? 10 : 0)}%, ${opacity * 0.4})`);
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = opacity;
          
          ctx.beginPath();
          ctx.moveTo(node1.x, node1.y);
          ctx.lineTo(node2.x, node2.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      sortedIndices.forEach(i => {
        const node = projectedNodes[i];
        const depth = node.depth;
        
        // Calculate size based on depth (closer nodes are larger)
        const baseSize = 3;
        const depthScale = Math.max(0.1, (depth + 1.5) / 2.5); // Scale from back to front, minimum 0.1
        const nodeSize = Math.max(1, baseSize * depthScale + Math.sin(time * 0.003 + i * 0.3) * 0.8);
        const pulseSize = Math.max(1, nodeSize + node.audioReactivity * 3);
        
        // Opacity based on depth
        const opacity = Math.max(0.3, depthScale);
        
        // Color variation based on depth and time
        const hue = (time * 0.1 + depth * 50 + i * 5) % 60 + 240; // Purple to blue
        
        // Outer glow - ensure radius is always positive
        const outerRadius = Math.max(1, pulseSize * 4 * highlightIntensity);
        const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, outerRadius);
        glowGradient.addColorStop(0, `hsla(${hue}, 85%, ${70 + (isHovering ? 10 : 0)}%, ${opacity * 0.6 * highlightIntensity})`);
        glowGradient.addColorStop(0.3, `hsla(${hue}, 80%, ${65 + (isHovering ? 10 : 0)}%, ${opacity * 0.4 * highlightIntensity})`);
        glowGradient.addColorStop(0.6, `hsla(${hue}, 75%, ${60 + (isHovering ? 10 : 0)}%, ${opacity * 0.2 * highlightIntensity})`);
        glowGradient.addColorStop(1, `hsla(${hue}, 70%, 55%, 0)`);
        
        ctx.globalAlpha = opacity * 0.8;
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, outerRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core - ensure radius is always positive
        const coreRadius = Math.max(0.5, pulseSize);
        const coreGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, coreRadius);
        coreGradient.addColorStop(0, `hsla(${hue}, 100%, ${95 + (isHovering ? 5 : 0)}%, ${opacity * highlightIntensity})`);
        coreGradient.addColorStop(0.5, `hsla(${hue}, 90%, ${75 + (isHovering ? 10 : 0)}%, ${opacity * 0.8 * highlightIntensity})`);
        coreGradient.addColorStop(1, `hsla(${hue}, 85%, ${65 + (isHovering ? 10 : 0)}%, ${opacity * 0.4 * highlightIntensity})`);
        
        ctx.globalAlpha = opacity;
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, coreRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Add energy particles flowing between nodes
      const numParticles = config.particles;
      for (let i = 0; i < numParticles; i++) {
        const progress = (time * 0.002 + i / numParticles) % 1;
        const connectionIndex = Math.floor((time * 0.001 + i * 13.7) % connections.length);
        const [nodeA, nodeB] = connections[connectionIndex];
        
        const startNode = projectedNodes[nodeA];
        const endNode = projectedNodes[nodeB];
        
        const x = startNode.x + (endNode.x - startNode.x) * progress;
        const y = startNode.y + (endNode.y - startNode.y) * progress;
        const depth = startNode.depth + (endNode.depth - startNode.depth) * progress;
        
        if (depth > -0.5) {
          const opacity = Math.max(0, (depth + 1) * 0.4 * (1 - Math.abs(progress - 0.5) * 2));
          const size = Math.max(0.5, 2 + Math.sin(progress * Math.PI) * 1.5);
          const particleRadius = Math.max(1, size * 3);
          
          const particleGradient = ctx.createRadialGradient(x, y, 0, x, y, particleRadius);
          particleGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
          particleGradient.addColorStop(0.5, `rgba(123, 97, 255, ${opacity * 0.6})`);
          particleGradient.addColorStop(1, `rgba(59, 130, 246, 0)`);
          
          ctx.globalAlpha = opacity;
          ctx.fillStyle = particleGradient;
          ctx.beginPath();
          ctx.arc(x, y, particleRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      time++;
      animationFrameRef.current = requestAnimationFrame(drawSphere);
    };

    drawSphere();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [rotation, targetRotation, velocity, isDragging, voiceMode, audioLevel, size, config.canvas, config.radius, config.particles, isHovering]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (voiceMode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    
    
    if (isDragging) {
      // Calculate delta movement for more responsive rotation
      const deltaX = x - lastMousePos.x;
      const deltaY = y - lastMousePos.y;
      
      // Update velocity for momentum
      const sensitivity = 2.0; // Increased sensitivity for better responsiveness
      const newVelocity = {
        x: deltaY * sensitivity,
        y: deltaX * sensitivity
      };
      setVelocity(newVelocity);
      
      // Update target rotation with more responsive mapping
      setTargetRotation(prev => ({
        x: prev.x + deltaY * sensitivity,
        y: prev.y + deltaX * sensitivity,
        z: prev.z
      }));
      
      setLastMousePos({ x, y });
    } else {
      // Gentle rotation when hovering but not dragging
      setTargetRotation({
        x: -y * 0.5, // Increased sensitivity
        y: x * 0.5,
        z: 0
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (voiceMode) return;
    
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setLastMousePos({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseEnter = () => {
    if (!voiceMode) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setIsDragging(false);
  };

  return (
    <motion.div
      className="relative flex items-center justify-center cursor-grab active:cursor-grabbing"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      style={{ width: config.canvas, height: config.canvas }}
    >
      {/* Multi-layered glow effect background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="rounded-full opacity-40 blur-3xl"
          style={{
            width: `${config.canvas * 0.8}px`,
            height: `${config.canvas * 0.8}px`,
            background: 'radial-gradient(circle, rgba(123, 97, 255, 0.6), rgba(59, 130, 246, 0.4), rgba(219, 39, 119, 0.2), transparent)'
          }}
        />
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="relative z-10"
        style={{ width: `${config.canvas}px`, height: `${config.canvas}px` }}
      />

      {/* Additional animated glow layers */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="rounded-full"
          style={{
            width: `${config.canvas * 0.6}px`,
            height: `${config.canvas * 0.6}px`,
            background: 'radial-gradient(circle, rgba(123, 97, 255, 0.3), rgba(59, 130, 246, 0.15), transparent)',
            filter: 'blur(40px)'
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Secondary pulse layer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="rounded-full"
          style={{
            width: `${config.canvas * 0.7}px`,
            height: `${config.canvas * 0.7}px`,
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25), rgba(123, 97, 255, 0.1), transparent)',
            filter: 'blur(50px)'
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
      </div>
    </motion.div>
  );
};