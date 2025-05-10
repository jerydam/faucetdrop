import Link from "next/link"
import { Droplet, Github, Twitter } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="flex items-center space-x-2">
              <Droplet className="h-6 w-6 text-blue-700" />
              <span className="text-xl font-bold">FaucetFactory</span>
            </Link>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Decentralized Token Faucets for Everyone</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-500 hover:text-blue-700 dark:text-gray-400">
                  About
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-gray-500 hover:text-blue-700 dark:text-gray-400">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-500 hover:text-blue-700 dark:text-gray-400">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-sm text-gray-500 hover:text-blue-700 dark:text-gray-400">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-500 hover:text-blue-700 dark:text-gray-400">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Connect</h3>
            <div className="flex space-x-4">
              <Link href="https://twitter.com" className="text-gray-500 hover:text-blue-700 dark:text-gray-400">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="https://github.com" className="text-gray-500 hover:text-blue-700 dark:text-gray-400">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} FaucetFactory. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <Link
              href="https://celo-alfajores.blockscout.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-blue-700 dark:text-gray-400"
            >
              View Contracts on Etherscan
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
