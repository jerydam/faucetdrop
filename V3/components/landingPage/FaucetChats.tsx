import Image from 'next/image';
import React from 'react';

export default function FaucetChat() {
  const messages = [
    {
      type: 'receiver',
      text: 'Are you launching a new token, rewarding contributors, onboarding first time users, or running a large-scale marketing Campaign?',
      sender: 'Faucet Team',
      avatar: '/favicon.png'
    },
    {
      type: 'sender',
      text: 'Yes! I need to distribute tokens to thousands of users efficiently.',
      sender: 'You',
      avatar: '/avatar.png'
    },
    {
      type: 'receiver',
      text: 'Faucet Drops gives you everything you need to distribute rewards safely, transparently, and at scale.',
      sender: 'Faucet Team',
      avatar: '/favicon.png'
    }
  ];

  return (
    <div className="flex items-center justify-center p-4 sm:p-8 mb-10">
      <div className="w-full max-w-4xl">
        {/* Chat Container */}
        <div className="rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6">

          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.type === 'sender' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xl ${
                  message.type === 'sender' 
                    ? '' 
                    : ''
                }`}>
                  <Image src={message.avatar} alt="Avatar" width={50} height={50} />
                </div>

                {/* Message Bubble */}
                <div className={`flex flex-col max-w-[75%] ${message.type === 'sender' ? 'items-end' : 'items-start'}`}>
                  <span className="text-white/60 text-xs mb-1 px-2">{message.sender}</span>
                  <div
                    className={`backdrop-blur-md rounded-2xl px-5 py-3 shadow-lg ${
                      message.type === 'sender'
                        ? 'bg-pink-500/20 border border-pink-400/30'
                        : 'bg-white/5 border border-white/20'
                    }`}
                  >
                    <p className="text-white leading-relaxed">{message.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Typing Indicator */}
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0">
              <Image src="/favicon.png" alt="Avatar" width={50} height={50} />
            </div>
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-5 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}