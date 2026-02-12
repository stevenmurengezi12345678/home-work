'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Building2, TrendingUp, DollarSign, Zap, LogOut, Trash2, Download, FileSpreadsheet, Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

const Dashboard = () => {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPlaceName, setNewPlaceName] = useState('')
  const [error, setError] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuthAndLoadPlaces()
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (!darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const checkAuthAndLoadPlaces = async () => {
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

      await loadPlaces()
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/')
    }
  }

  const loadPlaces = async () => {
    try {
      const token = Cookies.get('token')
      const response = await fetch('/api/places', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPlaces(data.places || [])
      }
    } catch (error) {
      console.error('Error loading places:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlace = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      const token = Cookies.get('token')
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newPlaceName })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create place')
        setCreating(false)
        return
      }

      setNewPlaceName('')
      setIsDialogOpen(false)
      await loadPlaces()
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = () => {
    Cookies.remove('token')
    router.push('/')
  }

  const handleDeletePlace = async (slug, placeName) => {
    if (!confirm(`Are you sure you want to delete "${placeName}"? This will also delete all records for this place.`)) {
      return
    }

    try {
      const token = Cookies.get('token')
      const response = await fetch(`/api/places/${slug}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await loadPlaces()
      }
    } catch (error) {
      console.error('Error deleting place:', error)
    }
  }

  // Export to Excel
  const exportToExcel = () => {
    const exportData = places.map(place => ({
      'Place Name': place.name,
      'Money Given': (place.totalMoneyGiven || 0).toFixed(2),
      'Money Used': (place.totalMoneyUsed || 0).toFixed(2),
      'Balance': ((place.totalMoneyGiven || 0) - (place.totalMoneyUsed || 0)).toFixed(2),
      'Power Units': (place.totalPowerUnits || 0).toFixed(2),
      'Records': place.recordCount || 0,
      'Profit/Loss %': place.totalMoneyGiven > 0 
        ? (((place.totalMoneyGiven - place.totalMoneyUsed) / place.totalMoneyGiven) * 100).toFixed(2) + '%'
        : '0%'
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Places Report')
    
    const timestamp = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `money-tracker-report-${timestamp}.xlsx`)
  }

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(18)
    doc.text('Money Tracker Report', 14, 20)
    
    // Date
    doc.setFontSize(11)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
    
    // Summary Stats
    doc.setFontSize(14)
    doc.text('Summary', 14, 45)
    
    const totalGiven = places.reduce((sum, p) => sum + (p.totalMoneyGiven || 0), 0)
    const totalUsed = places.reduce((sum, p) => sum + (p.totalMoneyUsed || 0), 0)
    const totalBalance = totalGiven - totalUsed
    const profitLoss = totalGiven > 0 ? ((totalBalance / totalGiven) * 100).toFixed(2) : 0
    
    doc.setFontSize(11)
    doc.text(`Total Money Given: $${totalGiven.toFixed(2)}`, 14, 55)
    doc.text(`Total Money Used: $${totalUsed.toFixed(2)}`, 14, 62)
    doc.text(`Total Balance: $${totalBalance.toFixed(2)}`, 14, 69)
    doc.text(`Overall Profit/Loss: ${profitLoss}%`, 14, 76)
    
    // Table
    const tableData = places.map(place => [
      place.name,
      `$${(place.totalMoneyGiven || 0).toFixed(2)}`,
      `$${(place.totalMoneyUsed || 0).toFixed(2)}`,
      `$${((place.totalMoneyGiven || 0) - (place.totalMoneyUsed || 0)).toFixed(2)}`,
      (place.totalPowerUnits || 0).toFixed(2),
      place.totalMoneyGiven > 0 
        ? (((place.totalMoneyGiven - place.totalMoneyUsed) / place.totalMoneyGiven) * 100).toFixed(2) + '%'
        : '0%'
    ])
    
    autoTable(doc, {
      startY: 85,
      head: [['Place', 'Given', 'Used', 'Balance', 'Power Units', 'P/L %']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] }
    })
    
    const timestamp = new Date().toISOString().split('T')[0]
    doc.save(`money-tracker-report-${timestamp}.pdf`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    )
  }

  // Calculate totals and analytics
  const totalGiven = places.reduce((sum, p) => sum + (p.totalMoneyGiven || 0), 0)
  const totalUsed = places.reduce((sum, p) => sum + (p.totalMoneyUsed || 0), 0)
  const totalBalance = totalGiven - totalUsed
  const totalPowerUnits = places.reduce((sum, p) => sum + (p.totalPowerUnits || 0), 0)
  const profitLossPercent = totalGiven > 0 ? ((totalBalance / totalGiven) * 100).toFixed(2) : 0

  // Prepare chart data
  const chartData = places.map((place) => ({
    name: place.name.length > 15 ? place.name.substring(0, 15) + '...' : place.name,
    balance: (place.totalMoneyGiven || 0) - (place.totalMoneyUsed || 0),
    given: place.totalMoneyGiven || 0,
    used: place.totalMoneyUsed || 0,
    powerUnits: place.totalPowerUnits || 0
  }))

  // Pie chart data for distribution
  const pieData = places.map((place, index) => ({
    name: place.name,
    value: place.totalMoneyGiven || 0
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 dark:from-gray-900 dark:via-gray-800 dark:to-black transition-colors">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Money Tracker Pro
          </h1>
          <div className="flex items-center gap-4">
            <Button
              onClick={toggleDarkMode}
              variant="outline"
              size="icon"
              className="text-white border-white/30 hover:bg-white/20"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-blue-900 hover:bg-blue-50">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Place
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>Create New Place</DialogTitle>
                  <DialogDescription>
                    Add a new place to track money and power units.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePlace}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Place Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter place name"
                        value={newPlaceName}
                        onChange={(e) => setNewPlaceName(e.target.value)}
                        required
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
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Place'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-white border-white/30 hover:bg-white/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Enhanced Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Places</CardTitle>
              <Building2 className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{places.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${totalBalance.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Profit/Loss %</CardTitle>
              <TrendingUp className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${profitLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {profitLossPercent}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Power Units</CardTitle>
              <Zap className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {totalPowerUnits.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <TrendingUp className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {places.reduce((sum, p) => sum + (p.recordCount || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Buttons */}
        {places.length > 0 && (
          <div className="flex gap-4 mb-8">
            <Button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button
              onClick={exportToPDF}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF Report
            </Button>
          </div>
        )}

        {/* Charts Grid */}
        {places.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* Balance Overview Chart */}
            <Card className="bg-white dark:bg-gray-800 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-white">Balance Overview</CardTitle>
                <CardDescription>Financial balance across all places</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => `$${value.toFixed(2)}`}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                      />
                      <Legend />
                      <Bar dataKey="balance" fill="#1e40af" name="Balance" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Money Flow Chart */}
            <Card className="bg-white dark:bg-gray-800 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-white">Money Flow Analysis</CardTitle>
                <CardDescription>Given vs Used comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => `$${value.toFixed(2)}`}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                      />
                      <Legend />
                      <Bar dataKey="given" fill="#10b981" name="Money Given" />
                      <Bar dataKey="used" fill="#ef4444" name="Money Used" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Power Units Distribution */}
            <Card className="bg-white dark:bg-gray-800 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-white">Power Units Distribution</CardTitle>
                <CardDescription>Power units by place</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => value.toFixed(2)}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                      />
                      <Legend />
                      <Bar dataKey="powerUnits" fill="#eab308" name="Power Units" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Investment Distribution Pie Chart */}
            <Card className="bg-white dark:bg-gray-800 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-white">Investment Distribution</CardTitle>
                <CardDescription>Money given by place</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Monthly Summary Table */}
        {places.length > 0 && (
          <Card className="bg-white dark:bg-gray-800 border-blue-200 mb-8">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-white">Detailed Summary Report</CardTitle>
              <CardDescription>Complete breakdown by place</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Place</th>
                      <th className="text-right p-2">Money Given</th>
                      <th className="text-right p-2">Money Used</th>
                      <th className="text-right p-2">Balance</th>
                      <th className="text-right p-2">Power Units</th>
                      <th className="text-right p-2">Records</th>
                      <th className="text-right p-2">P/L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {places.map((place) => {
                      const balance = (place.totalMoneyGiven || 0) - (place.totalMoneyUsed || 0)
                      const plPercent = place.totalMoneyGiven > 0 
                        ? ((balance / place.totalMoneyGiven) * 100).toFixed(2) 
                        : 0
                      
                      return (
                        <tr key={place.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-2 font-medium">{place.name}</td>
                          <td className="text-right p-2 text-green-600">${(place.totalMoneyGiven || 0).toFixed(2)}</td>
                          <td className="text-right p-2 text-red-600">${(place.totalMoneyUsed || 0).toFixed(2)}</td>
                          <td className={`text-right p-2 font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${balance.toFixed(2)}
                          </td>
                          <td className="text-right p-2 text-blue-600">{(place.totalPowerUnits || 0).toFixed(2)}</td>
                          <td className="text-right p-2">{place.recordCount || 0}</td>
                          <td className={`text-right p-2 font-semibold ${plPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {plPercent}%
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="font-bold bg-gray-100 dark:bg-gray-700">
                      <td className="p-2">TOTAL</td>
                      <td className="text-right p-2 text-green-600">${totalGiven.toFixed(2)}</td>
                      <td className="text-right p-2 text-red-600">${totalUsed.toFixed(2)}</td>
                      <td className={`text-right p-2 ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${totalBalance.toFixed(2)}
                      </td>
                      <td className="text-right p-2 text-blue-600">{totalPowerUnits.toFixed(2)}</td>
                      <td className="text-right p-2">
                        {places.reduce((sum, p) => sum + (p.recordCount || 0), 0)}
                      </td>
                      <td className={`text-right p-2 ${profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profitLossPercent}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Places Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {places.map((place) => {
            const balance = (place.totalMoneyGiven || 0) - (place.totalMoneyUsed || 0)
            const plPercent = place.totalMoneyGiven > 0 
              ? ((balance / place.totalMoneyGiven) * 100).toFixed(2) 
              : 0

            return (
              <Card key={place.id} className="bg-white dark:bg-gray-800 border-blue-200 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-blue-900 dark:text-white text-xl mb-1">
                        {place.name}
                      </CardTitle>
                      <CardDescription>
                        {place.recordCount || 0} records
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePlace(place.slug, place.name)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Balance</span>
                    <span className={`font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${balance.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Profit/Loss</span>
                    <span className={`font-semibold ${plPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {plPercent}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Money Given</span>
                    <span className="font-semibold text-green-600">
                      ${(place.totalMoneyGiven || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Money Used</span>
                    <span className="font-semibold text-red-600">
                      ${(place.totalMoneyUsed || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Power Units</span>
                    <span className="font-semibold text-blue-600">
                      {(place.totalPowerUnits || 0).toFixed(2)}
                    </span>
                  </div>

                  <Link href={`/place/${place.slug}`} className="block">
                    <Button className="w-full mt-4 bg-blue-900 hover:bg-blue-800">
                      View Details
                    </Button>
                  </Link>

                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {places.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-white/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No places yet</h3>
            <p className="text-white/70 mb-6">Create your first place to start tracking</p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-blue-900 hover:bg-blue-50">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Place
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>Create New Place</DialogTitle>
                  <DialogDescription>
                    Add a new place to track money and power units.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePlace}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Place Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter place name"
                        value={newPlaceName}
                        onChange={(e) => setNewPlaceName(e.target.value)}
                        required
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
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Place'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

      </div>
    </div>
  )
}

export default Dashboard