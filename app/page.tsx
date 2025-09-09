"use client";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { FiArrowRight, FiLinkedin, FiUsers } from "react-icons/fi";
import { motion } from "framer-motion";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import { SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { BsGlobe, BsGlobe2, BsGlobeAmericas, BsLinkedin, BsMeta, BsPersonFillGear } from "react-icons/bs";
import { AiOutlineUser, AiOutlineUsergroupAdd } from "react-icons/ai";
import { FaShopify, FaGoogle, FaGithub } from "react-icons/fa";
import { SiRoblox, SiClerk, SiStarbucks } from "react-icons/si";
import Link from "next/link";

// Stagger text animation component with scroll control
const StaggerText = ({
  text,
  className,
  color = "#eee",
  progress = 0,
  index = 0,
  delayMultiplier = 1
}: {
  text: string;
  className?: string;
  color?: string;
  progress?: number;
  index?: number;
  delayMultiplier?: number;
}) => {
  const words = text.split(" ");
  const questionProgress = Math.max(0, Math.min(1, progress * 1.5 - index));
  const opacity = Math.max(0, Math.min(1, questionProgress));

  return (
    <div className={`${className} ${color} max-w-4xl md:pl-20`} style={{ opacity }}>
      {words.map((word, i) => {
        const wordDelay = Math.max(0, Math.min(1, questionProgress * words.length * delayMultiplier - i));
        const wordOpacity = Math.max(0, Math.min(1, wordDelay));
        
        return (
          
          <span 
            key={i} 
            className="inline-block mr-2 transition-opacity duration-300 sf-medium"
            style={{ opacity: wordOpacity }}
          >
            
            {word}
          </span>
        );
      })}
    </div>
  );
};

// Company marquee data with logo components
const companies = [
  { name: "Shopify", icon: FaShopify },
  { name: "Starbucks", icon: SiStarbucks },
  { name: "Google", icon: FaGoogle },
  { name: "Roblox", icon: SiRoblox },
  { name: "Meta", icon: BsMeta },
  { name: "GitHub", icon: FaGithub },
  { name: "Clerk", icon: SiClerk }
];

// Roles and outcomes data
const roles = ["Advisors", "Investors", "Partners", "Clients", "Mentors", "Collaborators"];
const outcomes = ["Growth", "Trust", "Opportunities", "Expansion", "Impact", "Success"];
const contexts = ["Global", "Local", "Industries", "Markets", "Communities", "Startups"];

export default function Home() {
  const [activeFrame, setActiveFrame] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const textSectionRef = useRef<HTMLDivElement>(null);
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Frame rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFrame((prevFrame) => (prevFrame >= 4 ? 1 : prevFrame + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isLoaded && user) {
      router.push('/dashboard');
    }
  }, [isLoaded, user, router]);

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      if (!textSectionRef.current) return;
      
      const section = textSectionRef.current;
      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const sectionTop = rect.top;
      const sectionHeight = rect.height;
      const startFade = windowHeight / 2;
      const endFade = -sectionHeight * 0.2;
      
      let progress = 0;
      if (sectionTop < startFade && sectionTop > endFade) {
        progress = Math.max(0, Math.min(1, (startFade - sectionTop) / (startFade - endFade)));
      } else if (sectionTop <= endFade) {
        progress = 1;
      }
      
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="w-full h-full flex flex-col justify-center items-start">
      <Navbar/>

      {/* Hero Section */}
      <section className="w-full h-full flex flex-col justify-center items-center min-h-screen">
        <main className="w-full h-full flex flex-col mt-auto">
          <motion.div
            className="relative w-20 h-20 mx-auto mb-5"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Image
              src={`/frame${activeFrame}.png`}
              alt="hero"
              width={80}
              height={80}
              className="absolute inset-0 transition-all duration-500 ease-in-out"
            />
          </motion.div>
          
          <motion.h1 
            className="md:text-[75px] text-3xl text-center sf-bold leading-[1]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Turn Network <br /> into <b className="">Networth</b>.
          </motion.h1>
          
          <motion.p 
            className="md:text-xl text-base font-normal text-center md:max-w-lg max-w-[340px] mx-auto text-gray-600 pt-5 pb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Stop collecting contacts. Start building collaborations. Let your
            network work for you, powered by AI.
          </motion.p>
          
          <motion.div 
            className="w-full h-full flex flex-row justify-center items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <SignUpButton mode="modal">
              <button className="bg-[#181818] px-4 font-medium py-2 text-white rounded-full md:text-base text-sm transition-all duration-300 hover:bg-[#2e2e2e] hover:text-[#fff]">
                Join for free
              </button>
            </SignUpButton>
              <Link href="#knowmore" className="bg-[#fff] border-[1px] border-gray-200 pl-3 pr-2 font-medium py-2 text-black rounded-full md:text-base text-sm transition-all duration-300 hover:bg-[#f7f7f7] hover:text-[#000] flex flex-row items-center justify-center gap-2">
                Know more
                <b className="text-black bg-[#edededb8] rounded-full p-1">
                  <FiArrowRight className="font-semibold" />
                </b>
              </Link>
          </motion.div>
        </main>
        
        {/* Industries Marquee */}
        <motion.div
          id="knowmore" 
          className="w-full h-full flex flex-col justify-center items-center mt-auto mb-5"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <h6 className="text-sm uppercase tracking-wide text-gray-500 font-medium">
            Trusted by Leading Companies Worldwide
          </h6>
          <div className="w-full overflow-hidden pt-14 pb-10">
            <div className="flex animate-marquee whitespace-nowrap">
              <div className="flex items-center md:gap-32 gap-16 text-2xl text-gray-300">
                {[...companies, ...companies, ...companies, ...companies].map((company, index) => {
                  const IconComponent = company.icon;
                  return (
                    <span key={index} className="flex items-center">
                      <IconComponent className="w-8 h-8" />
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Text Section with Scroll Animation */}
      <section
        id="text-section"
        ref={textSectionRef}
        className="w-full bg-black md:py-[200px] py-20"
      >
        <div className="w-full h-full max-w-[1400px] mx-auto">
          <div className="w-full px-5 md:px-10">
            <StaggerText
              text="You already have hundreds of connections — but only a handful truly matter for your next big move. What if you could cut through the noise and instantly find the right partners, advisors, or clients who align with your mission? That's the power of combining your network with AI. In just a few simple steps, you can transform introductions into collaborations and contacts into growth."
              className="md:text-3xl text-xl leading-relaxed mb-8"
              color="text-white"
              progress={scrollProgress}
              index={0}
              delayMultiplier={1}
            />
            <StaggerText
              text="Curious how? Let me show you."
              className="md:text-3xl text-xl leading-relaxed"
              color="text-white"
              progress={scrollProgress}
              index={0.8}
              delayMultiplier={1.5}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full h-full flex flex-col justify-start items-center max-w-6xl mx-auto md:py-20 py-10">
        <motion.div
          className="w-full h-full flex flex-col justify-center items-center md:pt-0 pt-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.8 }}
        >
          <h2 className="md:text-[55px] text-xl sf-bold text-center leading-none">
            Your Journey in Just 3 Steps
          </h2>
          <p className="md:text-lg text-base text-center leading-relaxed mt-5 max-w-2xl">
            Whether you&apos;re looking for partners, advisors, or opportunities, it only takes three steps to go from contacts to collaborations. Here&apos;s how it works
          </p>
        </motion.div>

        <motion.div
          className="w-full h-full grid md:grid-cols-3 grid-cols-1 gap-5 mt-20 md:px-10 px-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3,
              },
            },
          }}
        >
          {[
            { title: "Enter your Linkedin network", subtitle: "Bring your connections onboard", description: "Easily import your LinkedIn connections or upload a contact list. We’ll organize them so your network is ready to work for you.", icon: <BsLinkedin/> },
            { title: "Define Your Mission", subtitle: "Share what you’re aiming for", description: "Whether it’s expanding into a new market, finding trusted advisors, or seeking collaborations, just tell us your goal — we’ll handle the heavy lifting.", icon: <BsGlobe2/> },
            { title: "Get Smart Matches", subtitle: "Discover the right people, instantly", description: "Our AI scans your network to highlight the most relevant partners, advisors, or clients. No noise, just meaningful connections that drive results.", icon: <FiUsers/> }
          ].map((step, index) => (
            <motion.div
              key={index}
              className="w-full h-full rounded-lg basis-1/3 flex flex-col justify-center items-start p-5 border-[1px] border-gray-200"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: "easeOut" },
                },
              }}
            >
              <span className="text-2xl">
                {step.icon}
              </span>
              <h5 className="md:text-2xl text-lg font-bold text-start leading-none mt-5">
                {step.title}
              </h5>
              {/* <p className="md:text-base text-base text-gray-400 font-bold text-center leading-none mt-2">
                {step.subtitle}
              </p> */}
              <p className="md:text-lg text-sm text-gray-400 font-medium text-start leading-tight mt-3">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>
      {/* Marquee Section */}
      <section className="w-full h-full md:py-10 py-20">
        <div className="w-full overflow-hidden">
          {/* Roles & People */}
          <div className="flex animate-marquee-left whitespace-nowrap mb-8">
            {[1, 2].map((set) => (
              <div key={set} className="flex items-center gap-16 md:text-5xl text-2xl font-semibold text-gray-800">
                {roles.map((role, index) => (
                  <span key={index}>
                    {role}
                    {index < roles.length - 1 && <span className="text-gray-400 ml-10">⬩</span>}
                  </span>
                ))}
              </div>
            ))}
          </div>

          {/* Outcomes & Value */}
          <div className="flex animate-marquee-right whitespace-nowrap mb-8">
            {[1, 2].map((set) => (
              <div key={set} className="flex items-center gap-16 md:text-5xl text-2xl font-semibold text-gray-800">
                {outcomes.map((outcome, index) => (
                  <span key={index}>
                    {outcome}
                    {index < outcomes.length - 1 && <span className="text-gray-400 ml-10">⬩</span>}
                  </span>
                ))}
              </div>
            ))}
          </div>

          {/* Context & Reach */}
          <div className="flex animate-marquee whitespace-nowrap">
            {[1, 2].map((set) => (
              <div key={set} className="flex items-center gap-16 md:text-5xl text-2xl font-semibold text-gray-800">
                {contexts.map((context, index) => (
                  <span key={index}>
                    {context}
                    {index < contexts.length - 1 && <span className="text-gray-400 ml-10">⬩</span>}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}