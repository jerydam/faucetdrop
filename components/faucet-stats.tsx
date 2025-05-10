"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFaucetEvents } from "@/hooks/use-faucet-events"

export function FaucetStats({ address }: { address: string }) {
  const { events, isLoading } = useFaucetEvents(address)

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg mt-4">
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 p-4 border rounded-lg mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Claim Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {events.claimed.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400">No claim activity yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.claimed.map((event, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">
                        {event.user.slice(0, 6)}...{event.user.slice(-4)}
                      </TableCell>
                      <TableCell>{event.amount} tokens</TableCell>
                      <TableCell>{new Date(event.timestamp * 1000).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funding Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {events.funded.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400">No funding activity yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funder</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.funded.map((event, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">
                        {event.funder.slice(0, 6)}...{event.funder.slice(-4)}
                      </TableCell>
                      <TableCell>{event.amount} tokens</TableCell>
                      <TableCell>{new Date(event.timestamp * 1000).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
