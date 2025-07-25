'use client';
import { useEffect } from "react";
import { useAuth } from '@/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Navigation from "@/components/parts/home/Navigation";
import Hero from "@/components/parts/home/Hero";
import Features from "@/components/parts/home/Features";
import HowItWorks from "@/components/parts/home/HowItWorks";
import Pricing from "@/components/parts/home/Pricing";
import Footer from "@/components/parts/home/Footer";

const HomePage = () => {
  const { signIn, user, loading } = useAuth();
  const router = useRouter();

  // Handle sign in and redirect to priorities page
  const handleGetStarted = async () => {
    try {
      // Check if user is already authenticated
      if (user) {
        console.log("User already authenticated, redirecting to dashboard");
        router.push('/dashboard');
        return;
      }
      
      // Start authentication flow
      console.log("Starting authentication flow for new user");
      await signIn('/dashboard');
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      console.log("Authenticated user detected on home page, redirecting to dashboard");
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Add smooth scroll effect for navigation
  useEffect(() => {
    // Set light mode by default (removed dark mode)
    document.documentElement.classList.remove('dark');
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetId = (e.target as HTMLAnchorElement).getAttribute('href')?.substring(1);
        if (!targetId) return;
        
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;
        
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Offset for header
          behavior: 'smooth'
        });
      });
    });
    
    // Animation on scroll
    const handleScroll = () => {
      const elements = document.querySelectorAll('.animate-on-scroll');
      
      elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight * 0.85) {
          element.classList.add('animate-fade-in');
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initialize on load
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-t-2 border-primary border-solid rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show home page if user is authenticated (they'll be redirected)
  if (user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation handleGetStarted={handleGetStarted} />
      <main>
        <Hero handleGetStarted={handleGetStarted} />
        <Features />
        <HowItWorks />
        <Pricing handleGetStarted={handleGetStarted} />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;