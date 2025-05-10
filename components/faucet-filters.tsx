"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, X } from "lucide-react"

export function FaucetFilters() {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search by token name or address" className="pl-10" />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-1 block">Token Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All Tokens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tokens</SelectItem>
                    <SelectItem value="erc20">ERC-20</SelectItem>
                    <SelectItem value="erc721">ERC-721</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Sort By</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Newest First" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="balance-high">Highest Balance</SelectItem>
                    <SelectItem value="balance-low">Lowest Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
