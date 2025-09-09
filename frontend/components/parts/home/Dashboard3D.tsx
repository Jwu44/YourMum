import Image from 'next/image'

interface Dashboard3DProps {
  src: string
  alt: string
  className?: string
  useEnhanced?: boolean
}

const Dashboard3D = ({ src, alt, className = "", useEnhanced = false }: Dashboard3DProps) => {
  return (
    <div className={`dashboard-3d-container ${className}`}>
      <div className="dashboard-3d-wrapper">
        <Image
          src={useEnhanced ? src.replace('.png', ' enhanced.png') : src}
          alt={alt}
          width={1200}
          height={800}
          className="dashboard-3d-image"
          priority
          quality={95}
        />
      </div>
      
      <style jsx>{`
        .dashboard-3d-container {
          perspective: 1200px;
          perspective-origin: center center;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem 0;
        }
        
        .dashboard-3d-wrapper {
          position: relative;
          transform-style: preserve-3d;
          transform: 
            rotateX(8deg) 
            rotateY(-15deg) 
            rotateZ(2deg)
            translateZ(0);
          will-change: transform;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          
          /* Vignette effect using pseudo-elements */
        }
        
        .dashboard-3d-wrapper::before {
          content: '';
          position: absolute;
          top: -15%;
          left: -15%;
          right: -15%;
          bottom: -15%;
          background: radial-gradient(
            ellipse 70% 60% at center center,
            transparent 35%,
            rgba(255, 255, 255, 0.3) 50%,
            rgba(255, 255, 255, 0.7) 70%,
            rgba(255, 255, 255, 0.9) 85%,
            #ffffff 100%
          );
          z-index: 2;
          pointer-events: none;
          border-radius: 24px;
        }
        
        .dashboard-3d-wrapper::after {
          content: '';
          position: absolute;
          top: -25%;
          left: -25%;
          right: -25%;
          bottom: -25%;
          background: radial-gradient(
            ellipse 60% 50% at center center,
            transparent 20%,
            rgba(255, 255, 255, 0.1) 30%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0.8) 75%,
            #ffffff 90%
          );
          z-index: 1;
          pointer-events: none;
          border-radius: 32px;
        }
        
        .dashboard-3d-image {
          width: 100%;
          height: auto;
          max-width: 1000px;
          border-radius: 16px;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 15px 30px -8px rgba(0, 0, 0, 0.15),
            0 5px 15px -5px rgba(0, 0, 0, 0.1);
          transform: translateZ(0);
          position: relative;
          z-index: 3;
        }
        
        .dashboard-3d-wrapper:hover {
          transform: 
            rotateX(6deg) 
            rotateY(-12deg) 
            rotateZ(1deg)
            translateZ(20px) 
            scale(1.02);
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .dashboard-3d-container {
            perspective: 800px;
            padding: 1rem 0;
          }
          
          .dashboard-3d-wrapper {
            transform: 
              rotateX(6deg) 
              rotateY(-12deg) 
              rotateZ(1deg)
              translateZ(0);
          }
          
          .dashboard-3d-wrapper:hover {
            transform: 
              rotateX(4deg) 
              rotateY(-10deg) 
              rotateZ(0.5deg)
              translateZ(10px) 
              scale(1.01);
          }
          
          .dashboard-3d-image {
            max-width: 100%;
            border-radius: 12px;
          }
        }
        
        @media (max-width: 480px) {
          .dashboard-3d-container {
            perspective: 600px;
          }
          
          .dashboard-3d-wrapper {
            transform: 
              rotateX(4deg) 
              rotateY(-8deg) 
              rotateZ(0.5deg)
              translateZ(0);
          }
          
          .dashboard-3d-wrapper:hover {
            transform: 
              rotateX(3deg) 
              rotateY(-6deg) 
              rotateZ(0deg)
              translateZ(5px) 
              scale(1.005);
          }
          
          .dashboard-3d-image {
            border-radius: 8px;
          }
        }
      `}</style>
    </div>
  )
}

export default Dashboard3D