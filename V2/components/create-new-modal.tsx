"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Droplets, ScrollText, BrainCircuit, ArrowRight } from "lucide-react"

export function CreateNewModal() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleNavigate = (path: string) => {
    setIsOpen(false)
    router.push(path)
  }

  const options = [
    {
      label: "Faucet",
      description: "Distribute tokens with custom rules.",
      icon: Droplets,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      path: "faucet/create-faucet" 
    },
    {
      label: "Quest",
      description: "Engage users with on-chain tasks.",
      icon: ScrollText,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      path: "/quest/create-quest" 
    },
    {
      label: "Quiz",
      description: "Test knowledge and reward winners.",
      icon: BrainCircuit,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-950/20",
      path: "/quiz/create-quiz" 
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1 md:flex-none bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="h-4 w-4" /> 
          <span className="hidden sm:inline">Create New</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center sm:text-left">What would you like to create?</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {options.map((opt) => (
            <Card 
              key={opt.label}
              className="relative group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md border-border"
              onClick={() => handleNavigate(opt.path)}
            >
              <div className="p-4 flex flex-col items-center sm:items-start text-center sm:text-left gap-3 h-full">
                <div className={`p-3 rounded-full ${opt.bg} ${opt.color}`}>
                  <opt.icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">{opt.label}</h3>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
                {/* Hover indicator */}
                <div className="mt-auto pt-2 w-full flex justify-center sm:justify-start opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-4 w-4 text-primary" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}