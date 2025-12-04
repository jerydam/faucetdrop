'use client'
import React from 'react'
import ScrollReveal from '@/components/ScrollReveal'
import MagneticButton from '@/components/MagneticButton'

export default function CTA() {
  return (
    <section className="py-20">
      <ScrollReveal direction="up" delay={200}>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight tracking-[-0.015em] px-4 pb-8 text-center text-white">
          Ready to build your web3 growth engine?
        </h2>
      </ScrollReveal>
      
      <ScrollReveal direction="up" delay={400}>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <MagneticButton 
            className="bg-linear-to-r from-[#0052FF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#0052FF] text-black font-bold px-8 py-4 rounded-full cursor-pointer transition-all shadow-lg shadow-[#94A3B8]/20 hover:shadow-xl hover:shadow-[#94A3B8]/30"
          >
            Launch App
          </MagneticButton>
          <MagneticButton 
            className="bg-transparent text-white border-2 border-[#0052FF] px-8 py-4 rounded-full font-bold hover:bg-[#0052FF]/10 cursor-pointer transition-all"
          >
            Talk to Our Team
          </MagneticButton>
        </div>
      </ScrollReveal>
    </section>
  )
}
