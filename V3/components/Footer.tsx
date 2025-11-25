"use client";

import Link from 'next/link';
import { Twitter, Github, Linkedin, Mail } from 'lucide-react'
import Image from 'next/image';

const Footer = () => {

  const footerLinks = [
    {
      title: 'Product',
      links: [
        { name: 'Features', href: '/features' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'Templates', href: '/templates' },
        { name: 'Integrations', href: '/integrations' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Careers', href: '/careers' },
        { name: 'Blog', href: '/blog' },
        { name: 'Press', href: '/press' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'Documentation', href: '/docs' },
        { name: 'Guides', href: '/guides' },
        { name: 'API Status', href: '/status' },
        { name: 'Help Center', href: '/help' },
      ],
    },
  ];

  const socialLinks = [
    { icon: <Twitter size={20} />, href: 'https://twitter.com', label: 'Twitter' },
    { icon: <Github size={20} />, href: 'https://github.com', label: 'GitHub' },
    { icon: <Linkedin size={20} />, href: 'https://linkedin.com', label: 'LinkedIn' },
    { icon: <Mail size={20} />, href: 'mailto:contact@example.com', label: 'Email' },
  ];

  return (
    <footer className={`w-full bg-linear-to-b from-0% to-[#020817] text-[#94A3B8]`}>
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
          {/* Logo and description */}
          <div className="lg:col-span-4">
            <div className="flex items-center space-x-2 mb-4">
              <Image 
                src='/favicon.png'
                alt='Logo'
                className='w-15 h-15'
                width={1000}
                height={1000}
              />
              <span className="text-2xl font-bold text-[#0052FF]">
                FaucetDrops
              </span>
            </div>
            <p className={`mb-6 text-[#94A3B8]`}>
              The all-in-one platform for building modern web applications with ease.
            </p>

            {/* Social links */}
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-full hover:bg-gray-800`}
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Footer links */}
          <div className="lg:col-span-5 grid grid-cols-2 md:grid-cols-3 gap-8">
            {footerLinks.map((section, index) => (
              <div key={index}>
                <h3 className={`text-sm font-semibold mb-4 uppercase tracking-wider text-white`}>
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link 
                        href={link.href}
                        className={`text-sm hover:text-[#2563EB] transition-colors text-[#94A3B8]`}
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className={`border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center border-gray-800`}>
          <p className="text-sm">
            {new Date().getFullYear()} Finna. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center md:justify-end gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="text-sm hover:text-[#2563EB] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm hover:text-[#2563EB] transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-sm hover:text-[#2563EB] transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
