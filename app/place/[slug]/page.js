'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, ArrowLeft, DollarSign, Zap, Calendar, Trash2 } from 'lucide-react'
import Link from 'next/link'

const PlacePage = () => {
  const [place, setPlace] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    moneyGiven: '',
    moneyUsed: '',
    powerUnits: ''
  })
  
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug

  useEffect(() => {
    if (slug) {
      checkAuthAndLoadData()
    }
  }, [slug])

  const checkAuthAndLoadData = async () => {
    try {
      const token = Cookies.get('token')
      if (!token) {
        router.push('/')
        return
      }

      const response = await fetch('/api/auth/check', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        Cookies.remove('token')
        router.push('/')
        return
      }

      await loadPlaceData()
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/')
    }
  }

  const loadPlaceData = async () => {
    try {
      const token = Cookies.get('token')
      const response = await fetch(`/api/places/${slug}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPlace(data.place)
        setRecords(data.records || [])
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error loading place:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      const token = Cookies.get('token')
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          placeId: place.id,
          ...formData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create record')
        setCreating(false)
        return
      }

      setFormData({
        date: new Date().toISOString().split('T')[0],
        moneyGiven: '',
        moneyUsed: '',
        powerUnits: ''
      })
      setIsDialogOpen(false)
      await loadPlaceData()
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteRecord = async (recordId) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return
    }

    try {
      const token = Cookies.get('token')
      const response = await fetch(`/api/records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await loadPlaceData()
      }
    } catch (error) {
      console.error('Error deleting record:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    )
  }

  if (!place) {
    return null
  }

  const totalMoneyGiven = records.reduce((sum, r) => sum + (r.moneyGiven || 0), 0)
  const totalMoneyUsed = records.reduce((sum, r) => sum + (r.moneyUsed || 0), 0)
  const totalPowerUnits = records.reduce((sum, r) => sum + (r.powerUnits || 0), 0)
  const balance = totalMoneyGiven - totalMoneyUsed

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-white hover:bg-white/20 mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">{place.name}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Money Given</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalMoneyGiven.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Money Used</CardTitle>
              <DollarSign className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${totalMoneyUsed.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${balance.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Power Units</CardTitle>
              <Zap className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{totalPowerUnits.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Record Button */}
        <div className="mb-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-blue-900 hover:bg-white/90">
                <Plus className="h-4 w-4 mr-2" />
                Add New Record
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Record</DialogTitle>
                <DialogDescription>
                  Add a new money and power usage record for {place.name}.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moneyGiven">Money Given ($)</Label>
                    <Input
                      id="moneyGiven"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.moneyGiven}
                      onChange={(e) => setFormData({ ...formData, moneyGiven: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moneyUsed">Money Used ($)</Label>
                    <Input
                      id="moneyUsed"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.moneyUsed}
                      onChange={(e) => setFormData({ ...formData, moneyUsed: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="powerUnits">Power Units (kWh)</Label>
                    <Input
                      id="powerUnits"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.powerUnits}
                      onChange={(e) => setFormData({ ...formData, powerUnits: e.target.value })}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Add Record'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Records Table */}
        {records.length === 0 ? (
          <Card className="bg-white border-blue-200">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">No records yet</p>
              <p className="text-gray-400 text-sm">Add your first record to start tracking</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Records History</CardTitle>
              <CardDescription>{records.length} total records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Money Given</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Money Used</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Power Units</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600 font-semibold">
                          ${(record.moneyGiven || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600 font-semibold">
                          ${(record.moneyUsed || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-blue-600 font-semibold">
                          {(record.powerUnits || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRecord(record.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default PlacePage